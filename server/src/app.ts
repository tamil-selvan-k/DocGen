import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import apiRouter from './routes';
import errorHandler from './middleware/error';
import { ApiError } from './utils/ApiError';
import { config } from './config/env';

const app = express();

// HTTP Request Logging - morgan('common') only as per design specification
app.use(morgan('common'));

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));

// Parse cookies
app.use(cookieParser());

// Parse JSON for all routes EXCEPT webhooks (webhooks need raw body for HMAC)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/v1/webhooks')) {
    // Skip body parsing — webhook router handles this manually
    return next();
  }
  express.json({ limit: '1mb' })(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API Routes
app.use('/api/v1', apiRouter);

// Catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(`Route ${req.method} ${req.path} not found`, 404));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;