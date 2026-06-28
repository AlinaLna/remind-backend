import type { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import User from '../models/user.model';
import type { AuthTokenPayload, UserRole, UserStatus } from '../types/common';

interface RegisterBody {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  role?: unknown;
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface RefreshBody {
  refreshToken?: unknown;
}

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const getAccessTokenSecret = (): string => process.env.JWT_SECRET || 'fallback_secret';
const getRefreshTokenSecret = (): string => process.env.REFRESH_TOKEN_SECRET || getAccessTokenSecret();

const isString = (value: unknown): value is string => typeof value === 'string';

const normalizeEmail = (value: unknown): string => (isString(value) ? value.trim().toLowerCase() : '');

const normalizeName = (value: unknown): string => (isString(value) ? value.trim() : '');

const digestToken = (value: string): string => createHash('sha256').update(value).digest('hex');

const buildTokenPayload = (user: {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  status: UserStatus;
  fullName?: string | null;
}): AuthTokenPayload => ({
  id: user._id.toString(),
  role: user.role,
  status: user.status,
  tokenType: 'access',
  jti: randomUUID(),
  ...(typeof user.fullName === 'string' && user.fullName.trim() ? { fullName: user.fullName.trim() } : {}),
});

const buildRefreshTokenPayload = (user: {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  status: UserStatus;
  fullName?: string | null;
}): AuthTokenPayload => ({
  id: user._id.toString(),
  role: user.role,
  status: user.status,
  tokenType: 'refresh',
  jti: randomUUID(),
  ...(typeof user.fullName === 'string' && user.fullName.trim() ? { fullName: user.fullName.trim() } : {}),
});

const buildSafeUserDto = (user: {
  _id: mongoose.Types.ObjectId;
  email: string;
  fullName?: string | null;
  role: UserRole;
  status: UserStatus;
}) => ({
  id: user._id.toString(),
  email: user.email,
  ...(typeof user.fullName === 'string' && user.fullName.trim() ? { fullName: user.fullName.trim() } : {}),
  role: user.role,
  status: user.status,
});

const issueTokenPair = async (user: {
  _id: mongoose.Types.ObjectId;
  email: string;
  fullName?: string | null;
  role: UserRole;
  status: UserStatus;
}): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = jwt.sign(buildTokenPayload(user), getAccessTokenSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  const refreshToken = jwt.sign(buildRefreshTokenPayload(user), getRefreshTokenSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId: mongoose.Types.ObjectId, refreshToken: string): Promise<void> => {
  const hashedRefreshToken = await bcrypt.hash(digestToken(refreshToken), 12);
  await User.updateOne({ _id: userId }, { $set: { refreshToken: hashedRefreshToken } });
};

const getUserByRefreshToken = async (refreshToken: string) => {
  const decoded = jwt.verify(refreshToken, getRefreshTokenSecret()) as AuthTokenPayload;
  if (decoded.tokenType !== 'refresh') {
    return null;
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.refreshToken) {
    return null;
  }

  const isMatch = await bcrypt.compare(digestToken(refreshToken), user.refreshToken);
  if (!isMatch) {
    return null;
  }

  return user;
};

const isDuplicateEmailError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return 'code' in error && (error as { code?: number }).code === 11000;
};

export const register: RequestHandler<{}, unknown, RegisterBody> = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = isString(req.body.password) ? req.body.password : '';
    const fullName = normalizeName(req.body.fullName);
    const requestedRole = isString(req.body.role) ? req.body.role : undefined;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (requestedRole && !['student', 'expert'].includes(requestedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const role = (requestedRole || 'student') as 'student' | 'expert';
    const status: UserStatus = role === 'expert' ? 'pending' : 'active';

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password: hashedPassword,
      fullName,
      role,
      status,
    });

    const { accessToken, refreshToken } = await issueTokenPair(user);
    await storeRefreshToken(user._id, refreshToken);

    return res.status(201).json({
      user: buildSafeUserDto(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login: RequestHandler<{}, unknown, LoginBody> = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = isString(req.body.password) ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'banned' || user.status === 'rejected') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);
    await storeRefreshToken(user._id, refreshToken);

    return res.status(200).json({
      user: buildSafeUserDto(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in' });
  }
};

export const refresh: RequestHandler<{}, unknown, RefreshBody> = async (req, res) => {
  try {
    const refreshToken = isString(req.body.refreshToken) ? req.body.refreshToken : '';

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const user = await getUserByRefreshToken(refreshToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (user.status === 'banned' || user.status === 'rejected') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    const { accessToken, refreshToken: nextRefreshToken } = await issueTokenPair(user);
    await storeRefreshToken(user._id, nextRefreshToken);

    return res.status(200).json({
      user: buildSafeUserDto(user),
      accessToken,
      refreshToken: nextRefreshToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const getGoogleClient = (): OAuth2Client => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID not configured');
  }
  return new OAuth2Client(clientId);
};

interface GoogleLoginBody {
  googleToken?: unknown;
}

export const googleLogin: RequestHandler<{}, unknown, GoogleLoginBody> = async (req, res) => {
  try {
    const googleToken = isString(req.body.googleToken) ? req.body.googleToken : '';
    if (!googleToken) {
      return res.status(400).json({ error: 'Google token is required' });
    }

    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const email = payload.email.toLowerCase();
    const fullName = payload.name?.trim() || email.split('@')[0];
    const googleId = payload.sub;

    let user = await User.findOne({ email });
    if (user) {
      if (user.status === 'banned' || user.status === 'rejected') {
        return res.status(403).json({ error: 'Account is blocked' });
      }
      if (!user.googleId) {
        user = await User.findByIdAndUpdate(user._id, { googleId }, { new: true }) as typeof user;
      }
    } else {
      user = await User.create({
        email,
        fullName,
        googleId,
        role: 'student',
        status: 'active',
      });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);
    await storeRefreshToken(user._id, refreshToken);

    return res.status(200).json({
      user: buildSafeUserDto(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'GOOGLE_CLIENT_ID not configured') {
      return res.status(500).json({ error: 'Google login not configured' });
    }
    console.error('Google login error:', error);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
};

export const logout: RequestHandler<{}, unknown, RefreshBody> = async (req, res) => {
  try {
    const refreshToken = isString(req.body.refreshToken) ? req.body.refreshToken : '';

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const user = await getUserByRefreshToken(refreshToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    await User.updateOne({ _id: user._id }, { $unset: { refreshToken: '' } });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};
