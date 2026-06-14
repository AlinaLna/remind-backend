import jwt from 'jsonwebtoken';
import type { UserRole, UserStatus } from '../types/common';

export const signToken = (id: string, role: UserRole, status: UserStatus = 'active', fullName?: string): string =>
  jwt.sign({ id, role, status, tokenType: 'access', fullName }, process.env.JWT_SECRET || 'test_jwt_secret');
