import mongoose, { Document, Schema, Types } from 'mongoose';
import { ResponderSkill } from '../incidents/incident.types.js';
import { GeoPoint } from '../../shared/types/common.types.js';

export type ResponderStatus = 'AVAILABLE' | 'ASSIGNED' | 'BUSY' | 'OFF_DUTY';

export interface IResponder extends Document {
  userId: Types.ObjectId;
  skills: ResponderSkill[];
  status: ResponderStatus;
  location: GeoPoint;
  organization: string;
  createdAt: Date;
  updatedAt: Date;
}

const responderSchema = new Schema<IResponder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    skills: {
      type: [String],
      enum: ['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE'],
      required: true,
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFF_DUTY'],
      default: 'AVAILABLE',
      required: true,
      index: true,
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
    organization: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index
responderSchema.index({ location: '2dsphere' });
responderSchema.index({ status: 1, skills: 1 });

export const Responder = mongoose.model<IResponder>('Responder', responderSchema);
