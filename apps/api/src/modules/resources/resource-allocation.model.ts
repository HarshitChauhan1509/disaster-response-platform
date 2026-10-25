import mongoose, { Document, Schema, Types } from 'mongoose';

export type AllocationStatus = 'ALLOCATED' | 'RELEASED' | 'CANCELLED';

export interface IResourceAllocation extends Document {
  incidentId: Types.ObjectId;
  resourceId: Types.ObjectId;
  quantity: number;
  allocatedBy: Types.ObjectId;
  status: AllocationStatus;
  allocatedAt: Date;
  releasedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const resourceAllocationSchema = new Schema<IResourceAllocation>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['ALLOCATED', 'RELEASED', 'CANCELLED'],
      default: 'ALLOCATED',
      required: true,
      index: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    releasedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceAllocationSchema.index({ incidentId: 1, status: 1 });
resourceAllocationSchema.index({ resourceId: 1, status: 1 });

export const ResourceAllocation = mongoose.model<IResourceAllocation>(
  'ResourceAllocation',
  resourceAllocationSchema
);
