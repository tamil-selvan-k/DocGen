import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import prisma from '../utils/prisma';

export interface JwtPayload {
  userId: string;
  email: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Prefer HTTP-only cookie, fall back to Authorization header
    let token: string | undefined = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      throw new ApiError('Authorization token missing', 401);
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError('Session expired, please login again', 401);
      }
      throw new ApiError('Invalid or malformed token', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new ApiError('User not found', 401);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
