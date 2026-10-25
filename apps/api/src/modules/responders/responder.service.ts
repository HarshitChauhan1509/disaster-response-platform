import { Types } from 'mongoose';
import { Responder, IResponder } from './responder.model.js';
import { User } from '../auth/user.model.js';
import {
  CreateResponderInput,
  QueryRespondersInput,
  UpdateResponderInput,
} from './responder.schemas.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../audit/audit.service.js';
import { PaginatedResult } from '../../shared/types/common.types.js';

export class ResponderService {
  static async create(data: CreateResponderInput, actorId: string): Promise<IResponder> {
    if (!Types.ObjectId.isValid(data.userId)) {
      throw AppError.badRequest('Invalid user ID format');
    }

    const user = await User.findById(data.userId);
    if (!user) {
      throw AppError.notFound('Associated user does not exist');
    }

    const existing = await Responder.findOne({ userId: data.userId });
    if (existing) {
      throw AppError.conflict('A responder profile already exists for this user');
    }

    const responder = await Responder.create({
      userId: new Types.ObjectId(data.userId),
      skills: data.skills,
      status: data.status || 'AVAILABLE',
      location: data.location,
      organization: data.organization,
    });

    await AuditService.record({
      actorId,
      action: 'RESPONDER_CREATED',
      entityType: 'RESPONDER',
      entityId: responder._id,
      metadata: {
        userId: data.userId,
        skills: data.skills,
        organization: data.organization,
      },
    });

    return responder.populate('userId', 'name email role isActive');
  }

  static async list(filter: QueryRespondersInput): Promise<PaginatedResult<IResponder>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.skill) {
      query.skills = filter.skill;
    }
    if (filter.organization) {
      query.organization = new RegExp(filter.organization, 'i');
    }

    // Geospatial proximity query via $geoWithin $centerSphere
    if (filter.longitude !== undefined && filter.latitude !== undefined) {
      const radiusInRadians = (filter.maxDistanceKm || 50) / 6378.1;
      query.location = {
        $geoWithin: {
          $centerSphere: [[filter.longitude, filter.latitude], radiusInRadians],
        },
      };
    }

    const [items, total] = await Promise.all([
      Responder.find(query)
        .populate('userId', 'name email role isActive')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Responder.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as unknown as IResponder[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getById(id: string): Promise<IResponder> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid responder ID format');
    }

    const responder = await Responder.findById(id).populate('userId', 'name email role isActive');
    if (!responder) {
      throw AppError.notFound(`Responder not found with ID: ${id}`);
    }

    return responder;
  }

  static async getByUserId(userId: string): Promise<IResponder | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    return Responder.findOne({ userId }).populate('userId', 'name email role isActive');
  }

  static async update(id: string, data: UpdateResponderInput, actorId: string): Promise<IResponder> {
    const responder = await this.getById(id);

    Object.assign(responder, data);
    await responder.save();

    await AuditService.record({
      actorId,
      action: 'RESPONDER_UPDATED',
      entityType: 'RESPONDER',
      entityId: responder._id,
      metadata: { changedFields: Object.keys(data), newStatus: responder.status },
    });

    return responder.populate('userId', 'name email role isActive');
  }
}
