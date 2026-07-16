import { Worker, Job } from 'bullmq';
import { config } from '../config/env';
import { DOC_QUEUE_NAME, DocJobData } from './index';
import { GitHubClient } from '../utils/github';
import { GeminiClient } from '../utils/gemini';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Extracts changed file paths from a unified diff string.
 */
function extractChangedFiles(diff: string): string[] {
  const files: string[] = [];
  const lines = diff.split('\n');
  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      const filePath = line.slice(6).trim();
      if (filePath && !files.includes(filePath)) {
        files.push(filePath);
      }
    }
  }
  return files;
}

/**
 * Extracts simple facts from a diff for hallucination validation.
 * Returns an array of concrete fact strings derived from the diff.
 */
function extractFactsFromDiff(diff: string): string[] {
  const facts: string[] = [];
  const lines = diff.split('\n');

  for (const line of lines) {
    // Capture added function/class/interface/const/export declarations
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      if (
        content.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
        content.match(/^(export\s+)?(abstract\s+)?class\s+\w+/) ||
        content.match(/^(export\s+)?interface\s+\w+/) ||
        content.match(/^(export\s+)?(const|let|var)\s+\w+/) ||
        content.match(/^(export\s+)?type\s+\w+/)
      ) {
        facts.push(`Added: ${content.slice(0, 120)}`);
      }
    }

    // Capture removed declarations
    if (line.startsWith('-') && !line.startsWith('---')) {
      const content = line.slice(1).trim();
      if (
        content.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
        content.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)
      ) {
        facts.push(`Removed: ${content.slice(0, 120)}`);
      }
    }
  }

  return facts;
}

/**
 * Determines which documentation file to update based on changed source files.
 */
function selectDocFile(changedFiles: string[]): string {
  // If there are API route changes, target API docs
  if (changedFiles.some(f => f.includes('/routes/') || f.includes('/controllers/'))) {
    return 'docs/API.md';
  }
  // Default: update README.md
  return 'README.md';
}

/**
 * The core BullMQ worker processor.
 * Orchestrates the full pipeline: fetch diff → extract facts → generate docs
 * → validate → create branch → commit → open PR → record results.
 */
async function processDocJob(job: Job<DocJobData>): Promise<void> {
  const { jobId, repositoryId, commitSha, installationId, owner, repo, defaultBranch } = job.data;

  logger.info(`Worker processing job ${jobId}: ${owner}/${repo}@${commitSha.slice(0, 7)}`);

  // ── STEP 1: Mark job as PROCESSING ──────────────────────────────────────
  await prisma.documentationJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', attempts: { increment: 1 } },
  });

  try {
    // ── STEP 2: Fetch commit diff from GitHub ────────────────────────────
    logger.info(`[${jobId}] Fetching commit diff...`);

    interface CommitDetail {
      files?: { filename: string; patch?: string; status: string }[];
    }

    const commitDetail = await GitHubClient.apiRequest<CommitDetail>(
      `/repos/${owner}/${repo}/commits/${commitSha}`,
      await GitHubClient.getInstallationToken(installationId),
      { headers: { Accept: 'application/vnd.github.v3.diff' } }
    );

    // Build a unified diff string from file patches
    const diff = (commitDetail.files || [])
      .filter(f => f.patch)
      .map(f => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
      .join('\n\n');

    if (!diff.trim()) {
      logger.info(`[${jobId}] No diff content — marking as SUCCEEDED (no docs update needed)`);
      await prisma.documentationJob.update({
        where: { id: jobId },
        data: { status: 'SUCCEEDED' },
      });
      return;
    }

    // ── STEP 3: Identify changed files and extract facts ─────────────────
    const changedFiles = extractChangedFiles(diff);
    const extractedFacts = extractFactsFromDiff(diff);
    const docFilePath = selectDocFile(changedFiles);

    logger.info(`[${jobId}] Changed files: ${changedFiles.join(', ')}`);
    logger.info(`[${jobId}] Target doc file: ${docFilePath}`);
    logger.info(`[${jobId}] Extracted ${extractedFacts.length} facts from diff`);

    // ── STEP 4: Fetch existing documentation file content ────────────────
    const token = await GitHubClient.getInstallationToken(installationId);
    let existingDocContent = '';
    let existingDocSha: string | undefined;

    try {
      const { content, sha } = await GitHubClient.getFileContent(
        installationId, owner, repo, docFilePath, defaultBranch
      );
      existingDocContent = content;
      existingDocSha = sha;
      logger.info(`[${jobId}] Fetched existing ${docFilePath} (${content.length} chars)`);
    } catch {
      logger.info(`[${jobId}] ${docFilePath} not found — will create it fresh`);
    }

    // ── STEP 5: Call Gemini to generate documentation ────────────────────
    logger.info(`[${jobId}] Calling Gemini API for doc generation...`);

    const fileContexts = existingDocContent
      ? [{ path: docFilePath, content: existingDocContent }]
      : [];

    const generatedDocs = await GeminiClient.generateDocumentation(diff, fileContexts);

    // ── STEP 6: Validate generated docs against extracted facts ──────────
    logger.info(`[${jobId}] Validating generated documentation...`);

    const validation = await GeminiClient.validateDocumentation(
      generatedDocs, diff, extractedFacts
    );

    if (!validation.isValid) {
      const reason = `Gemini validation rejected output: ${validation.reason}`;
      logger.warn(`[${jobId}] ${reason}`);

      await prisma.documentationJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorReason: reason },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FAILURE',
          details: JSON.stringify({ jobId, reason, repositoryId }),
        },
      });

      // Throw so BullMQ can retry if attempts remain
      throw new Error(reason);
    }

    logger.info(`[${jobId}] Documentation validated successfully`);

    // ── STEP 7: Save documentation version snapshot ──────────────────────
    await prisma.documentationVersion.create({
      data: { repositoryId, commitSha, filePath: docFilePath, content: generatedDocs, jobId },
    });

    // ── STEP 8: Create a new branch for the documentation PR ─────────────
    const branchName = `autodocs/update-${commitSha.slice(0, 7)}`;
    logger.info(`[${jobId}] Creating branch: ${branchName}`);

    try {
      await GitHubClient.createBranch(installationId, owner, repo, branchName, defaultBranch);
    } catch (err: any) {
      // If branch already exists (422), continue — don't fail the job
      if (!err.message?.includes('422')) throw err;
      logger.warn(`[${jobId}] Branch ${branchName} already exists, continuing...`);
    }

    // ── STEP 9: Commit documentation changes to the branch ───────────────
    logger.info(`[${jobId}] Committing documentation changes...`);

    await GitHubClient.createOrUpdateFile(
      installationId,
      owner,
      repo,
      docFilePath,
      generatedDocs,
      `docs: auto-update ${docFilePath} for commit ${commitSha.slice(0, 7)} [AutoDocs AI]`,
      branchName,
      existingDocSha // Pass SHA if file exists to update rather than create
    );

    // ── STEP 10: Open a Pull Request ─────────────────────────────────────
    logger.info(`[${jobId}] Opening Pull Request...`);

    const prBody = [
      '## AutoDocs AI — Automated Documentation Update',
      '',
      `This PR was automatically generated by **AutoDocs AI** in response to commit [\`${commitSha.slice(0, 7)}\`](https://github.com/${owner}/${repo}/commit/${commitSha}).`,
      '',
      '### Changed Files',
      changedFiles.map(f => `- \`${f}\``).join('\n'),
      '',
      '### Documentation Updated',
      `- \`${docFilePath}\``,
      '',
      '> ⚠️ Please review before merging. AutoDocs AI only includes facts derived directly from the code diff.',
    ].join('\n');

    const pr = await GitHubClient.createPullRequest(
      installationId,
      owner,
      repo,
      `docs: Update ${docFilePath} for ${commitSha.slice(0, 7)}`,
      branchName,
      defaultBranch,
      prBody
    );

    logger.info(`[${jobId}] PR created: ${pr.html_url}`);

    // ── STEP 11: Persist PR record & mark job SUCCEEDED ──────────────────
    await prisma.pullRequest.create({
      data: {
        repositoryId,
        jobId,
        pullRequestNumber: pr.number,
        htmlUrl: pr.html_url,
        branchName,
        status: 'OPEN',
      },
    });

    await prisma.documentationJob.update({
      where: { id: jobId },
      data: { status: 'SUCCEEDED' },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PR',
        details: JSON.stringify({ jobId, prUrl: pr.html_url, prNumber: pr.number, repositoryId }),
      },
    });

    logger.info(`[${jobId}] Job completed successfully → PR #${pr.number}`);

  } catch (error: any) {
    // ── FAILURE PATH ─────────────────────────────────────────────────────
    const reason = error?.message || 'Unknown error';
    logger.error(`[${jobId}] Job failed: ${reason}`, error);

    // Only mark as FAILED if we've exhausted retries
    const attemptsMade = (job.attemptsMade ?? 0) + 1;
    const maxAttempts = job.opts?.attempts ?? 3;

    if (attemptsMade >= maxAttempts) {
      await prisma.documentationJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorReason: reason },
      });

      await prisma.auditLog.create({
        data: {
          action: 'FAILURE',
          details: JSON.stringify({ jobId, reason, repositoryId, finalAttempt: true }),
        },
      });
    }

    throw error; // Re-throw so BullMQ handles retry logic
  }
}

// ── Worker Factory ────────────────────────────────────────────────────────────

let workerInstance: Worker<DocJobData> | null = null;

export const startWorker = (): Worker<DocJobData> => {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker<DocJobData>(
    DOC_QUEUE_NAME,
    processDocJob,
    {
      connection: {
        url: config.REDIS_URL,
        maxRetriesPerRequest: null as null,
        enableReadyCheck: false,
      },
      concurrency: 3,
    }
  );

  workerInstance.on('completed', (job) => {
    logger.info(`Worker: job ${job.id} completed`);
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(`Worker: job ${job?.id} failed`, err);
  });

  workerInstance.on('error', (err) => {
    logger.error('Worker encountered an error', err);
  });

  logger.info(`BullMQ worker started on queue '${DOC_QUEUE_NAME}' (concurrency: 3)`);
  return workerInstance;
};

export const stopWorker = async (): Promise<void> => {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    logger.info('BullMQ worker stopped');
  }
};
