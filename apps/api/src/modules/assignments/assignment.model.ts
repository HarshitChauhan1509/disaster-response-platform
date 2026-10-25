import mongoose, { Document, Schema, Types } from 'mongoose';
import { AssignmentStatus } from './assignment.state-machine.js';

export interface IAssignment extends Document {
  incidentId: Types.ObjectId;
  responderId: Types.ObjectId;
  status: AssignmentStatus;
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    responderId: {
      type: Schema.Types.ObjectId,
      ref: 'Responder',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    acceptedAt: {
      type: Date,
    },
    completedAt: {
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

// Compound index to help query active assignments quickly
assignmentSchema.index({ responderId: 1, status: 1 });
assignmentSchema.index({ incidentId: 1, status: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);
