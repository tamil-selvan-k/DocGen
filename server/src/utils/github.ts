import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config, getGitHubPrivateKey } from '../config/env';
import { logger } from './logger';
import { ApiError } from './ApiError';

export interface GitHubRepoDetails {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
}

export class GitHubClient {
  // Simple in-memory cache for installation tokens: { [installationId]: { token, expiresAt } }
  private static tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  /**
   * Generates a signed JWT for the GitHub App.
   * Valid for 9 minutes.
   */
  public static generateAppJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 1 minute clock skew buffer
      exp: now + 9 * 60, // 9 minutes expiry
      iss: config.GITHUB_APP_ID,
    };

    const privateKey = getGitHubPrivateKey();
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  }

  /**
   * Retrieves an installation access token for a specific installation ID.
   * Caches tokens in-memory until they expire.
   */
  public static async getInstallationToken(installationId: string): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    const now = Date.now();

    // If cached and still valid (with 2-minute buffer)
    if (cached && cached.expiresAt > now + 120000) {
      return cached.token;
    }

    const appJwt = this.generateAppJwt();
    const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appJwt}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'AutoDocs-AI',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub token request failed (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as { token: string; expires_at: string };
      const expiresAt = new Date(data.expires_at).getTime();

      this.tokenCache.set(installationId, { token: data.token, expiresAt });
      logger.info(`Retrieved new installation token for GitHub App Installation ID: ${installationId}`);
      return data.token;
    } catch (error) {
      logger.error(`Failed to retrieve installation token for installation: ${installationId}`, error);
      throw new ApiError('Failed to authenticate with GitHub App installation', 500);
    }
  }

  /**
   * Verifies the HMAC-SHA256 signature of a GitHub webhook payload.
   */
  public static verifyWebhookSignature(signature: string | undefined, rawBody: string): boolean {
    if (!signature) {
      logger.warn('Webhook signature missing');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', config.GITHUB_WEBHOOK_SECRET);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      
      const sigBuffer = Buffer.from(signature);
      const digestBuffer = Buffer.from(digest);

      if (sigBuffer.length !== digestBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, digestBuffer);
    } catch (error) {
      logger.error('Error verifying webhook signature', error);
      return false;
    }
  }


  /**
   * Custom request options that allow passing plain objects as JSON body.
   */
  private static buildFetchOptions(
    token: string,
    options: { method?: string; body?: Record<string, unknown> | string | null; headers?: Record<string, string> } = {}
  ): RequestInit {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('X-GitHub-Api-Version', '2022-11-28');
    headers.set('User-Agent', 'AutoDocs-AI');

    let body: BodyInit | undefined;
    if (options.body !== null && options.body !== undefined) {
      if (typeof options.body === 'string') {
        body = options.body;
      } else {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.body);
      }
    }

    return { method: options.method || 'GET', headers, body };
  }

  /**
   * Generic GitHub API request utility.
   */
  public static async apiRequest<T>(
    endpoint: string,
    token: string,
    options: { method?: string; body?: Record<string, unknown> | string | null; headers?: Record<string, string> } = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    const fetchOptions = this.buildFetchOptions(token, options);
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`GitHub API Error: ${response.status} [${options.method || 'GET'} ${endpoint}] - ${errorText}`);
      throw new ApiError(`GitHub API error: ${response.statusText}`, response.status, [errorText]);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  /**
   * Get Repository details.
   */
  public static async getRepository(
    installationId: string,
    owner: string,
    repo: string
  ): Promise<GitHubRepoDetails> {
    const token = await this.getInstallationToken(installationId);
    return this.apiRequest<GitHubRepoDetails>(`/repos/${owner}/${repo}`, token);
  }

  /**
   * Fetches file content and its SHA hash from a repository.
   */
  public static async getFileContent(
    installationId: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<{ content: string; sha: string }> {
    const token = await this.getInstallationToken(installationId);
    const query = ref ? `?ref=${ref}` : '';
    
    interface GitHubContentResponse {
      content: string;
      sha: string;
      encoding: string;
    }

    const res = await this.apiRequest<GitHubContentResponse>(
      `/repos/${owner}/${repo}/contents/${path}${query}`,
      token
    );

    if (res.encoding !== 'base64') {
      throw new Error(`Unsupported content encoding: ${res.encoding}`);
    }

    const content = Buffer.from(res.content, 'base64').toString('utf8');
    return { content, sha: res.sha };
  }

  /**
   * Creates or updates a file in a repository.
   */
  public static async createOrUpdateFile(
    installationId: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<{ content: { sha: string } }> {
    const token = await this.getInstallationToken(installationId);
    const body: any = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    };
    if (sha) {
      body.sha = sha;
    }

    return this.apiRequest<{ content: { sha: string } }>(
      `/repos/${owner}/${repo}/contents/${path}`,
      token,
      {
        method: 'PUT',
        body,
      }
    );
  }

  /**
   * Creates a branch based on an existing commit/ref.
   */
  public static async createBranch(
    installationId: string,
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string = 'main'
  ): Promise<any> {
    const token = await this.getInstallationToken(installationId);
    
    // Get the SHA of the base branch
    const refData = await this.apiRequest<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
      token
    );
    const baseSha = refData.object.sha;

    // Create a new branch ref pointing to the base SHA
    return this.apiRequest(
      `/repos/${owner}/${repo}/git/refs`,
      token,
      {
        method: 'POST',
        body: {
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        },
      }
    );
  }

  /**
   * Opens a new Pull Request.
   */
  public static async createPullRequest(
    installationId: string,
    owner: string,
    repo: string,
    title: string,
    headBranch: string,
    baseBranch: string,
    body?: string
  ): Promise<{ html_url: string; number: number }> {
    const token = await this.getInstallationToken(installationId);

    return this.apiRequest<{ html_url: string; number: number }>(
      `/repos/${owner}/${repo}/pulls`,
      token,
      {
        method: 'POST',
        body: {
          title,
          head: headBranch,
          base: baseBranch,
          body,
        },
      }
    );
  }
}
