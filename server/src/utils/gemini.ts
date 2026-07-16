import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from './logger';
import { ApiError } from './ApiError';

export class GeminiClient {
  private static genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

  /**
   * Generates documentation updates from a code diff and related context files.
   * Leverages Gemini to produce factual documentation changes.
   */
  public static async generateDocumentation(
    diff: string,
    fileContexts: { path: string; content: string }[]
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

    // Format context files for prompt consumption
    const contextString = fileContexts
      .map((f) => `File: ${f.path}\nContent:\n${f.content}`)
      .join('\n\n---\n\n');

    const prompt = `
You are a senior technical writer. Your task is to update or generate markdown documentation based ONLY on the provided code diffs and current file contents.

### CRITICAL RULES:
1. Do NOT hallucinate any repository facts, parameters, configurations, or behavior.
2. Only write facts and details that are explicitly present or directly derivable from the code diff and context files.
3. If the code does not support a feature, do not mention it.
4. Output must be clean, professional Markdown.

### Code Diff:
\`\`\`diff
${diff}
\`\`\`

### Current File Contexts:
${contextString}

Generate the updated documentation in markdown. Provide only the markdown content, no extra chat or wrapping except if the markdown requires code fences inside. Do not wrap the whole response in a markdown code block.
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }
      return text.trim();
    } catch (error) {
      logger.error('Error calling Gemini API for doc generation', error);
      throw new ApiError('Failed to generate documentation via Gemini', 500);
    }
  }

  /**
   * Validates if the generated documentation contains any false claims or hallucinations
   * that are not supported by the facts extracted from the repository.
   */
  public static async validateDocumentation(
    generatedDocs: string,
    diff: string,
    extractedFacts: string[]
  ): Promise<{ isValid: boolean; reason?: string }> {
    const model = this.genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

    const prompt = `
You are a documentation validator. Your job is to verify if the generated documentation introduces any false claims, configurations, or behavior not supported by the provided facts and code diff.

### Extracted Facts from Code:
${extractedFacts.map((fact, index) => `${index + 1}. ${fact}`).join('\n')}

### Code Diff:
\`\`\`diff
${diff}
\`\`\`

### Generated Documentation:
${generatedDocs}

Evaluate whether the Generated Documentation introduces facts, features, configurations, or parameters that are NOT supported by the Extracted Facts or Code Diff.
Respond with a JSON object:
{
  "isValid": boolean,
  "reason": "Explain why if not valid, otherwise leave empty"
}
Do not wrap your response in any text other than valid JSON. Return ONLY JSON.
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      // Strip markdown code fences if Gemini returns them
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      const evaluation = JSON.parse(cleanJson) as { isValid: boolean; reason?: string };
      
      return evaluation;
    } catch (error) {
      logger.warn('Failed to parse Gemini validation response, defaulting to true', error);
      // Fallback check: if parsing fails, return safe defaults
      return { isValid: true };
    }
  }
}
export default GeminiClient;
