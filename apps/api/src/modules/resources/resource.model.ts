import mongoose, { Document, Schema } from 'mongoose';
import { GeoPoint } from '../../shared/types/common.types.js';

export type ResourceType =
  | 'MEDICAL'
  | 'FOOD'
  | 'WATER'
  | 'VEHICLE'
  | 'SHELTER'
  | 'EQUIPMENT'
  | 'OTHER';

export type ResourceStatus = 'AVAILABLE' | 'LOW' | 'EXHAUSTED' | 'INACTIVE';

export interface IResource extends Document {
  name: string;
  type: ResourceType;
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  location: GeoPoint;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['MEDICAL', 'FOOD', 'WATER', 'VEHICLE', 'SHELTER', 'EQUIPMENT', 'OTHER'],
      required: true,
      index: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: [0, 'Total quantity cannot be negative'],
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
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
    status: {
      type: String,
      enum: ['AVAILABLE', 'LOW', 'EXHAUSTED', 'INACTIVE'],
      default: 'AVAILABLE',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ location: '2dsphere' });
resourceSchema.index({ status: 1, type: 1 });

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
