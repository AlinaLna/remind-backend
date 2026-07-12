import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const expertSchema = new Schema(
  {
    profile: {
      professionalTitle: { type: String },
      bio: { type: String },
      specialties: { type: [String] },
      languages: { type: [String] },
    },
    license: {
      licenseNumber: { type: String },
      issuedBy: { type: String },
      verificationStatus: { type: String },
    },
    approval: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      rejectionReason: { type: String },
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    refreshToken: { type: String, select: false },
    fullName: { type: String, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    role: { type: String, enum: ['student', 'expert', 'admin', 'system_manager'], required: true },
    status: { type: String, enum: ['active', 'pending', 'rejected', 'banned'], default: 'pending' },
    expert: { type: expertSchema, default: undefined },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export default mongoose.model<UserDoc>('User', userSchema);
