import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  // Check if headers are already sent
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] = [];

  // Log error with stack trace
  logger.error(`Error processing request [${req.method} ${req.path}]`, err);

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    return res.status(statusCode).json(err.toJSON());
  }

  // Handle other common error types
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation Failed';
    errors = err.issues || err.errors || [];
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired';
  }

  const responseErrorPayload: any = {
    message,
  };

  if (errors.length > 0) {
    responseErrorPayload.errors = errors;
  }

  if (config.NODE_ENV === 'development') {
    responseErrorPayload.stack = err.stack || String(err);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: responseErrorPayload,
    meta: null,
  });
};

export default errorHandler;
