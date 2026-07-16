import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

// ── Schemas ───────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ── Token helpers ─────────────────────────────────────────────────────────────

const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

const signAccessToken = (userId: string, email: string): string =>
  jwt.sign({ userId, email }, config.JWT_SECRET, { expiresIn: '15m' });

const signRefreshToken = (userId: string): string =>
  jwt.sign({ userId }, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });

function setAuthCookies(res: Response, userId: string, email: string) {
  const accessToken = signAccessToken(userId, email);
  const refreshToken = signRefreshToken(userId);

  res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });         // 15 min
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

  return { accessToken, refreshToken };
}

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', COOKIE_OPTS);
  res.clearCookie('refreshToken', COOKIE_OPTS);
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError('Validation failed', 400, parsed.error.issues);

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'SIGNUP', details: JSON.stringify({ email }) },
  });

  const { accessToken } = setAuthCookies(res, user.id, user.email);
  logger.info(`New user registered: ${email}`);

  return new ApiResponse(201, { user: { id: user.id, email: user.email } }, 'Account created successfully');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError('Validation failed', 400, parsed.error.issues);

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError('Invalid email or password', 401);
  }

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN', details: JSON.stringify({ email }) },
  });

  setAuthCookies(res, user.id, user.email);
  logger.info(`User logged in: ${email}`);

  return new ApiResponse(200, { user: { id: user.id, email: user.email } }, 'Login successful');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.refreshToken;
  if (!token) throw new ApiError('Refresh token missing', 401);

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new ApiError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new ApiError('User not found', 401);

  setAuthCookies(res, user.id, user.email);

  return new ApiResponse(200, { user: { id: user.id, email: user.email } }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  clearAuthCookies(res);
  return new ApiResponse(200, null, 'Logged out successfully');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { gitHubAccount: { select: { id: true, username: true } } },
  });

  if (!user) throw new ApiError('User not found', 404);

  return new ApiResponse(200, {
    id: user.id,
    email: user.email,
    github: user.gitHubAccount
      ? { id: user.gitHubAccount.id, username: user.gitHubAccount.username }
      : null,
    createdAt: user.createdAt,
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError('Validation failed', 400, parsed.error.issues);

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new ApiError('User not found', 404);

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError('Current password is incorrect', 400);
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'CHANGE_PASSWORD', details: JSON.stringify({}) },
  });

  // Rotate cookies after password change
  setAuthCookies(res, user.id, user.email);
  return new ApiResponse(200, null, 'Password changed successfully');
});
