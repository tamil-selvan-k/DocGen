import assert from 'node:assert';
import crypto from 'node:crypto';
import { test, describe, before } from 'node:test';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';

// Set up mock environment variables before importing any config/utils modules
process.env.PORT = '8000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://dummy:password@localhost:5432/dbname';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'testjwtsecretlongenough';
process.env.GITHUB_CLIENT_ID = 'dummy-client-id';
process.env.GITHUB_CLIENT_SECRET = 'dummy-client-secret';
process.env.GITHUB_APP_ID = '123456';
process.env.GITHUB_PRIVATE_KEY = Buffer.from('-----BEGIN RSA PRIVATE KEY-----\ndummy-key-data\n-----END RSA PRIVATE KEY-----').toString('base64');
process.env.GITHUB_WEBHOOK_SECRET = 'dummy-webhook-secret';
process.env.GEMINI_API_KEY = 'dummy-gemini-key';

describe('AutoDocs AI - Foundation Unit Tests', () => {
  let config: any;
  let getGitHubPrivateKey: any;
  let GitHubClient: any;

  before(async () => {
    // Import configuration modules dynamically after setting process.env
    const envModule = await import('../config/env');
    config = envModule.config;
    getGitHubPrivateKey = envModule.getGitHubPrivateKey;

    const githubModule = await import('../utils/github');
    GitHubClient = githubModule.GitHubClient;
  });

  describe('Environment Config Loader', () => {
    test('should parse environment variables successfully', () => {
      assert.strictEqual(config.PORT, 8000);
      assert.strictEqual(config.NODE_ENV, 'test');
      assert.strictEqual(config.GITHUB_APP_ID, '123456');
    });

    test('should base64 decode private key correctly', () => {
      const decodedKey = getGitHubPrivateKey();
      assert.match(decodedKey, /BEGIN RSA PRIVATE KEY/);
    });
  });

  describe('ApiResponse Envelope', () => {
    test('should match the standard { success, data, error, meta } structure', () => {
      const apiResponse = new ApiResponse(200, { user: 'alice' }, 'User fetched successfully');
      const serialized = apiResponse.toJSON();

      assert.strictEqual(serialized.success, true);
      assert.deepStrictEqual(serialized.data, { user: 'alice' });
      assert.strictEqual(serialized.error, null);
      assert.deepStrictEqual(serialized.meta, { message: 'User fetched successfully' });
    });
  });

  describe('ApiError Envelope', () => {
    test('should match the standard error structure', () => {
      const details = [{ field: 'email', issue: 'invalid' }];
      const apiError = new ApiError('Validation Failed', 400, details);
      const serialized = apiError.toJSON();

      assert.strictEqual(serialized.success, false);
      assert.strictEqual(serialized.data, null);
      assert.deepStrictEqual(serialized.error, {
        message: 'Validation Failed',
        errors: details
      });
      assert.strictEqual(serialized.meta, null);
    });
  });

  describe('GitHub HMAC Signature Verification', () => {
    test('should verify correct HMAC sha256 signature', () => {
      const rawPayload = JSON.stringify({ event: 'ping' });
      const signature = 'sha256=' + crypto
        .createHmac('sha256', 'dummy-webhook-secret')
        .update(rawPayload)
        .digest('hex');

      const isVerified = GitHubClient.verifyWebhookSignature(signature, rawPayload);
      assert.strictEqual(isVerified, true);
    });

    test('should reject invalid signature', () => {
      const isVerified = GitHubClient.verifyWebhookSignature('sha256=invalid-signature', 'payload');
      assert.strictEqual(isVerified, false);
    });
  });
});
