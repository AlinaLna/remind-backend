import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const forumPostSchema = new Schema(
  {
    forumId: { type: Schema.Types.ObjectId, ref: 'Forum', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorDisplayMode: { type: Number, enum: [0, 1], required: true },
    publicAuthorName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'hidden', 'deleted', 'under_review'],
      default: 'active',
      index: true,
    },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

forumPostSchema.index({ title: 'text', content: 'text', tags: 'text' });
forumPostSchema.index({ status: 1, createdAt: -1 });

export type ForumPostDoc = InferSchemaType<typeof forumPostSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export default mongoose.model<ForumPostDoc>('ForumPost', forumPostSchema);
