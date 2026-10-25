import mongoose, { Document, Schema } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  path: string;
  method: string;
  userId?: string;
  statusCode: number;
  responseBody: unknown;
  createdAt: Date;
}

const idempotencySchema = new Schema<IIdempotencyKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours TTL
    },
  },
  {
    timestamps: false,
  }
);

export const IdempotencyRecord = mongoose.model<IIdempotencyKey>('IdempotencyRecord', idempotencySchema);
