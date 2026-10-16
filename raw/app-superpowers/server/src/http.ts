import type { Request, Response } from 'express';
import type { User } from '@boardline/shared';

export type AppRequest = Request & { user: User | null };

export function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

export function requireUser(req: Request, res: Response): User | null {
  const user = (req as AppRequest).user;
  if (!user) {
    sendError(res, 401, 'Sign in required.');
    return null;
  }
  return user;
}
