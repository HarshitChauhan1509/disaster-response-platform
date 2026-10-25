import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  ITimelineEvent,
  ResponderSkill,
} from './incident.types.js';
import { GeoPoint } from '../../shared/types/common.types.js';

export interface IIncident extends Document {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedPeople: number;
  location: GeoPoint;
  address: string;
  requiredSkills: ResponderSkill[];
  priorityScore: number;
  reportedBy: Types.ObjectId;
  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const timelineEventSchema = new Schema<ITimelineEvent>(
  {
    eventType: {
      type: String,
      required: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const incidentSchema = new Schema<IIncident>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['FLOOD', 'EARTHQUAKE', 'FIRE', 'BUILDING_COLLAPSE', 'CYCLONE', 'MEDICAL', 'OTHER'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['REPORTED', 'VERIFIED', 'ACTIVE', 'CONTAINED', 'RESOLVED', 'REJECTED', 'CANCELLED'],
      default: 'REPORTED',
      required: true,
      index: true,
    },
    affectedPeople: {
      type: Number,
      required: true,
      min: [0, 'Affected people cannot be negative'],
      default: 0,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (coords: number[]) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90,
          message: 'Invalid coordinates: longitude must be [-180, 180] and latitude [-90, 90]',
        },
      },
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    requiredSkills: {
      type: [String],
      enum: ['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE'],
      default: [],
    },
    priorityScore: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ status: 1, priorityScore: -1 });
incidentSchema.index({ createdAt: -1 });

export const Incident = mongoose.model<IIncident>('Incident', incidentSchema);
