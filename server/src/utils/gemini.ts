import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from './logger';

// Hard limits to prevent context-window overflow on large repos/diffs
const MAX_EXISTING_DOCS_CHARS = 6000;
const MAX_GENERATED_DOCS_CHARS = 8000;
const MAX_DIFF_CHARS = 4000;

function truncate(text: string, limit: number, label: string): string {
  if (text.length <= limit) return text;
  logger.warn(`GeminiClient: truncating ${label} from ${text.length} to ${limit} chars`);
  return text.slice(0, limit) + '\n... [truncated for context-window safety]';
}

export class GeminiClient {
  private static genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

  /**
   * Generates documentation updates from a code diff and related context files.
   */
  public static async generateDocumentation(
    diff: string,
    fileContexts: { path: string; content: string }[]
  ): Promise<{ updateNeeded: boolean; updatedMarkdown: string; reason: string }> {
    const model = this.genAI.getGenerativeModel({
      model: config.GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const contextString = fileContexts
      .map((f) => `File: ${f.path}\nContent:\n${f.content}`)
      .join('\n\n---\n\n');

    const safeDiff = truncate(diff, MAX_DIFF_CHARS, 'diff');

    const prompt = `
You are a senior technical writer. Analyze the code diff and decide if the existing documentation needs updating.

### RULES:
1. Set updateNeeded to false for: build scripts, CI configs, dependency version bumps, internal refactors, tests, or comments — unless they directly alter a public-facing interface, command, or configuration key visible to end users.
2. When updatedMarkdown is required: treat the existing documentation as your immutable base. Preserve ALL pre-existing content exactly as written. Only add or modify the specific sentences or sections directly necessitated by the diff. Never remove a section unless the diff explicitly deletes the feature it describes.
3. Only state facts that are explicitly shown in the code diff. Do not infer capabilities, parameters, or behavior beyond what is directly visible.
4. updatedMarkdown must be the complete file (not a patch) — but differ from the existing content only in the sections the diff touches.

### Code Diff:
\`\`\`diff
${safeDiff}
\`\`\`

### Current File Contexts:
${contextString || '(no existing documentation — create a minimal new file based solely on the diff)'}

Respond with a JSON object:
{
  "updateNeeded": boolean,
  "updatedMarkdown": string,
  "reason": string
}
Return ONLY a valid JSON object.
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new Error('Empty response from Gemini API');

      const cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson) as { updateNeeded: boolean; updatedMarkdown: string; reason: string };

      const updateNeeded = typeof parsed.updateNeeded === 'boolean' ? parsed.updateNeeded : false;
      const updatedMarkdown = typeof parsed.updatedMarkdown === 'string' ? parsed.updatedMarkdown.trim() : '';
      const reason = typeof parsed.reason === 'string' ? parsed.reason : 'Completed analysis';

      // Never proceed with an empty file — that would wipe existing docs
      if (updateNeeded && !updatedMarkdown) {
        logger.warn('Gemini returned updateNeeded: true with empty updatedMarkdown — skipping to prevent data loss');
        return { updateNeeded: false, updatedMarkdown: '', reason: 'Empty markdown returned; skipped to prevent data loss' };
      }

      return { updateNeeded, updatedMarkdown, reason };
    } catch (error) {
      // On any API or parse failure, skip rather than risk committing garbage or an empty file
      logger.warn('Gemini generateDocumentation error — skipping safely to prevent data loss', error);
      return { updateNeeded: false, updatedMarkdown: '', reason: 'Gemini API or parse error; skipped safely' };
    }
  }

  /**
   * Validates that the generated documentation does not introduce hallucinated claims
   * unsupported by the diff. Existing unchanged content is accepted unless the diff
   * explicitly contradicts it.
   */
  public static async validateDocumentation(
    generatedDocs: string,
    existingDocs: string,
    diff: string,
    extractedFacts: string[]
  ): Promise<{ isValid: boolean; reason?: string }> {
    const model = this.genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

    const safeExisting  = truncate(existingDocs,   MAX_EXISTING_DOCS_CHARS,   'existingDocs');
    const safeGenerated = truncate(generatedDocs,   MAX_GENERATED_DOCS_CHARS,  'generatedDocs');
    const safeDiff      = truncate(diff,            MAX_DIFF_CHARS,            'diff (validator)');

    const existingDocsSection = safeExisting
      ? `### Existing Documentation (context only — not the subject of validation):\n${safeExisting}`
      : `### Existing Documentation:\n(none — this is a new file)`;

    const factsSection = extractedFacts.length > 0
      ? extractedFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')
      : '(none — the diff contains no named declarations; use the raw diff lines as the evidence base)';

    const prompt = `
You are a strict documentation validator. Your sole job is to catch hallucinated or fabricated claims in updated documentation.

${existingDocsSection}

### Extracted Facts from Code Diff:
${factsSection}

### Code Diff:
\`\`\`diff
${safeDiff}
\`\`\`

### Updated Documentation (subject of validation):
${safeGenerated}

### Validation rules — apply in order:
1. Identify every claim in "Updated Documentation" that is NEW or CHANGED compared to "Existing Documentation".
2. For each new or changed claim: it is valid only if it can be DIRECTLY and EXPLICITLY traced to a specific line in the Code Diff or a specific entry in Extracted Facts. Loose inference or plausible assumption does not count.
3. If ANY new or changed claim cannot be directly traced, set isValid: false and name that specific claim in "reason".
4. Pre-existing content that is copied unchanged is acceptable UNLESS the diff explicitly removes or contradicts it (e.g. a deleted function is still described as present, a renamed config key still uses the old name).
5. If there are no new or changed claims at all, set isValid: true.
6. Minor rewording of pre-existing facts without adding new information is always valid.

Respond with:
{
  "isValid": boolean,
  "reason": "Name the specific unsupported claim if invalid, otherwise empty string"
}
Return ONLY valid JSON.
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      const evaluation = JSON.parse(cleanJson) as { isValid: boolean; reason?: string };

      // Type-guard: a non-boolean isValid (e.g. the string "false") defaults to failed
      const isValid = typeof evaluation.isValid === 'boolean' ? evaluation.isValid : false;
      return { isValid, reason: evaluation.reason };
    } catch (error) {
      logger.warn('Failed to parse Gemini validation response, defaulting to invalid', error);
      return { isValid: false, reason: 'Validation response could not be parsed' };
    }
  }
}

export default GeminiClient;
