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
  ): Promise<{ updateNeeded: boolean; updatedMarkdown: string; reason: string }> {
    const model = this.genAI.getGenerativeModel({
      model: config.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // Format context files for prompt consumption
    const contextString = fileContexts
      .map((f) => `File: ${f.path}\nContent:\n${f.content}`)
      .join('\n\n---\n\n');

    const prompt = `
You are a senior technical writer. Your task is to analyze the provided code diffs and decide if any updates are needed for the documentation files. If so, generate the updated markdown content.

### CRITICAL RULES:
1. Do NOT hallucinate any repository facts, parameters, configurations, or behavior.
2. Only write facts and details that are explicitly present or directly derivable from the code diff and context files.
3. If the code does not support a feature, do not mention it.
4. Output markdown must be clean and professional.

### Code Diff:
\`\`\`diff
${diff}
\`\`\`

### Current File Contexts:
${contextString}

Determine if this code change requires updating the documentation.
Respond with a JSON object following this exact schema:
{
  "updateNeeded": boolean, // Set to true if the code diff contains changes that should be documented (e.g. new features, public API changes, changed config keys). Set to false if the changes are internal (e.g. refactoring, internal tests, styling, comments) and DO NOT warrant any documentation changes.
  "updatedMarkdown": string, // The complete, updated markdown documentation file contents. If updateNeeded is false, set this to an empty string.
  "reason": string // A brief explanation of why an update was or was not needed.
}
Return ONLY a valid JSON object.
`;

    let text = '';
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text();
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson) as { updateNeeded: boolean; updatedMarkdown: string; reason: string };

      return {
        updateNeeded: typeof parsed.updateNeeded === 'boolean' ? parsed.updateNeeded : true,
        updatedMarkdown: parsed.updatedMarkdown || '',
        reason: parsed.reason || 'Completed analysis',
      };
    } catch (error) {
      logger.warn('Failed to parse Gemini response as JSON, falling back to assuming update is needed', error);
      return {
        updateNeeded: true,
        updatedMarkdown: text ? text.trim() : '',
        reason: 'Failed to parse JSON response',
      };
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
      logger.warn('Failed to parse Gemini validation response, defaulting to invalid', error);
      return { isValid: false, reason: 'Validation response could not be parsed' };
    }
  }
}
export default GeminiClient;
