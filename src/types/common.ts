import type { JwtPayload } from 'jsonwebtoken';
import type { Types } from 'mongoose';

export type UserRole = 'student' | 'expert' | 'admin' | 'system_manager';
export type UserStatus = 'active' | 'pending' | 'rejected' | 'banned';
export type AuthorDisplayMode = 0 | 1; // 0 = real_name, 1 = anonymous
export type ForumPostStatus = 'active' | 'hidden' | 'deleted' | 'under_review';
export type ReportTargetType = 'user' | 'expert' | 'post' | 'comment' | 'message' | 'bug';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type AuthTokenType = 'access' | 'refresh';

export interface AuthTokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
  tokenType: AuthTokenType;
  status?: UserStatus;
  fullName?: string;
}

export interface ExpertApproval {
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface ExpertProfile {
  professionalTitle?: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
}

export interface ExpertLicense {
  licenseNumber?: string;
  issuedBy?: string;
  verificationStatus?: string;
}

export interface ExpertSubdocument {
  profile?: ExpertProfile;
  license?: ExpertLicense;
  approval?: ExpertApproval;
}
