import { type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, UserRole } from '../types/common';

const getAccessTokenSecret = (): string => process.env.JWT_SECRET || 'fallback_secret';

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, getAccessTokenSecret()) as AuthTokenPayload;
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireActiveUser: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.status !== 'active') {
    return res.status(403).json({ error: 'Active account required' });
  }

  next();
};

export const requireRole = (role: UserRole): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
