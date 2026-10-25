import mongoose, { Document, Schema, Types } from 'mongoose';

export type AuditAction =
  | 'LOGIN'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'INCIDENT_STATUS_CHANGED'
  | 'RESPONDER_CREATED'
  | 'RESPONDER_UPDATED'
  | 'RESPONDER_ASSIGNED'
  | 'ASSIGNMENT_STATUS_CHANGED'
  | 'RESOURCE_CREATED'
  | 'RESOURCE_UPDATED'
  | 'RESOURCE_ALLOCATED'
  | 'RESOURCE_RELEASED';

export type AuditEntityType =
  | 'USER'
  | 'INCIDENT'
  | 'RESPONDER'
  | 'ASSIGNMENT'
  | 'RESOURCE'
  | 'RESOURCE_ALLOCATION';

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
