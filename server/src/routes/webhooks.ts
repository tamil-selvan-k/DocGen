import { Router, Request, Response, NextFunction } from 'express';
import { receiveWebhook } from '../controllers/webhooks';

const router = Router();

/**
 * CRITICAL: Webhooks need the raw request body (as Buffer/string) for HMAC verification.
 * We attach it to req.rawBody before the JSON parser consumes it.
 */
const captureRawBody = (req: Request, res: Response, next: NextFunction): void => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => { data += chunk; });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
  req.on('error', next);
};

// POST /api/v1/webhooks/github
// Note: express.json() is bypassed here by reading the raw stream directly.
router.post('/github', captureRawBody, (req: Request, res: Response, next: NextFunction) => {
  // Manually parse JSON after capturing raw body
  try {
    if ((req as any).rawBody) {
      req.body = JSON.parse((req as any).rawBody);
    }
  } catch {
    req.body = {};
  }
  next();
}, receiveWebhook);

export default router;
