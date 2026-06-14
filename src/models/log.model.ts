import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const logSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, trim: true },
    targetId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

logSchema.index({ actorId: 1, createdAt: -1 });
logSchema.index({ action: 1, createdAt: -1 });

export type LogDoc = InferSchemaType<typeof logSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
};

export default mongoose.model<LogDoc>('Log', logSchema);
