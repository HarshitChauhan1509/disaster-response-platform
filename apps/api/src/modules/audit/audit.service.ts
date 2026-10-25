import { ClientSession, Types } from 'mongoose';
import { AuditLog, AuditAction, AuditEntityType, IAuditLog } from './audit.model.js';
import { PaginatedResult } from '../../shared/types/common.types.js';

export interface CreateAuditEntry {
  actorId: string | Types.ObjectId;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryFilter {
  page?: number;
  limit?: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  actorId?: string;
  entityId?: string;
}

export class AuditService {
  /**
   * Append-only audit record creation, with optional transaction session.
   */
  static async record(entry: CreateAuditEntry, session?: ClientSession): Promise<IAuditLog> {
    const doc = new AuditLog({
      actorId: new Types.ObjectId(entry.actorId.toString()),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId.toString(),
      metadata: entry.metadata || {},
    });

    if (session) {
      await doc.save({ session });
    } else {
      await doc.save();
    }

    return doc;
  }

  /**
   * Paginated audit log retrieval with actor populated.
   */
  static async list(filter: AuditQueryFilter): Promise<PaginatedResult<IAuditLog>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter.action) query.action = filter.action;
    if (filter.entityType) query.entityType = filter.entityType;
    if (filter.actorId) query.actorId = new Types.ObjectId(filter.actorId);
    if (filter.entityId) query.entityId = filter.entityId;

    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as unknown as IAuditLog[],
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
}
