import mongoose, { Types } from 'mongoose';
import { Resource, IResource, ResourceStatus } from './resource.model.js';
import {
  ResourceAllocation,
  IResourceAllocation,
} from './resource-allocation.model.js';
import { Incident } from '../incidents/incident.model.js';
import { IncidentStateMachine } from '../incidents/incident.state-machine.js';
import { IncidentService } from '../incidents/incident.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  AllocateResourceInput,
  CreateResourceInput,
  QueryResourcesInput,
  UpdateResourceInput,
} from './resource.schemas.js';
import { PaginatedResult } from '../../shared/types/common.types.js';

export class ResourceService {
  private static calculateStatus(available: number, total: number): ResourceStatus {
    if (available <= 0) return 'EXHAUSTED';
    if (available <= total * 0.2) return 'LOW';
    return 'AVAILABLE';
  }

  static async create(data: CreateResourceInput, actorId: string): Promise<IResource> {
    const availableQuantity =
      data.availableQuantity !== undefined ? data.availableQuantity : data.totalQuantity;

    if (availableQuantity > data.totalQuantity) {
      throw AppError.badRequest('Available quantity cannot exceed total quantity');
    }

    const calculatedStatus =
      data.status || this.calculateStatus(availableQuantity, data.totalQuantity);

    const resource = await Resource.create({
      ...data,
      availableQuantity,
      status: calculatedStatus,
    });

    await AuditService.record({
      actorId,
      action: 'RESOURCE_CREATED',
      entityType: 'RESOURCE',
      entityId: resource._id,
      metadata: { name: resource.name, type: resource.type, totalQuantity: resource.totalQuantity },
    });

    return resource;
  }

  static async list(filter: QueryResourcesInput): Promise<PaginatedResult<IResource>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.name = new RegExp(filter.search, 'i');
    }

    const sortField = filter.sort || 'createdAt';
    const sortDir = filter.order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Resource.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
      Resource.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as unknown as IResource[],
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

  static async getById(id: string): Promise<IResource> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid resource ID format');
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      throw AppError.notFound(`Resource not found with ID: ${id}`);
    }

    return resource;
  }

  static async update(id: string, data: UpdateResourceInput, actorId: string): Promise<IResource> {
    const resource = await this.getById(id);

    const total = data.totalQuantity ?? resource.totalQuantity;
    const available = data.availableQuantity ?? resource.availableQuantity;

    if (available > total) {
      throw AppError.badRequest('Available quantity cannot exceed total quantity');
    }

    Object.assign(resource, data);
    if (resource.status !== 'INACTIVE') {
      resource.status = this.calculateStatus(resource.availableQuantity, resource.totalQuantity);
    }

    await resource.save();

    await AuditService.record({
      actorId,
      action: 'RESOURCE_UPDATED',
      entityType: 'RESOURCE',
      entityId: resource._id,
      metadata: { changedFields: Object.keys(data) },
    });

    return resource;
  }

  /**
   * Concurrency-safe atomic resource allocation.
   * Uses atomic findOneAndUpdate with $inc to guarantee no over-subscription.
   * Handles transactions when replica sets are configured.
   */
  static async allocate(
    resourceId: string,
    data: AllocateResourceInput,
    actorId: string
  ): Promise<IResourceAllocation> {
    if (!Types.ObjectId.isValid(resourceId)) {
      throw AppError.badRequest('Invalid resource ID format');
    }
    if (!Types.ObjectId.isValid(data.incidentId)) {
      throw AppError.badRequest('Invalid incident ID format');
    }

    const incident = await Incident.findById(data.incidentId);
    if (!incident) {
      throw AppError.notFound(`Incident not found with ID: ${data.incidentId}`);
    }

    if (!IncidentStateMachine.isAssignable(incident.status)) {
      throw AppError.badRequest(
        `Cannot allocate resources to incident with status '${incident.status}'. Incident must be in VERIFIED, ACTIVE, or CONTAINED status.`
      );
    }

    // Check if connected MongoDB deployment supports transactions (Replica Set or Sharded)
    let session: mongoose.ClientSession | null = null;
    let isTransactionActive = false;

    try {
      const client = typeof (mongoose.connection as unknown as { getClient?: () => unknown }).getClient === 'function'
        ? (mongoose.connection as unknown as { getClient: () => { topology?: { description?: { type?: string } } } }).getClient()
        : null;
      const topologyType = client?.topology?.description?.type;
      const canUseTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

      if (canUseTransactions) {
        session = await mongoose.startSession();
        session.startTransaction();
        isTransactionActive = true;
      }
    } catch {
      session = null;
      isTransactionActive = false;
    }

    try {
      // 1. Critical Concurrency Requirement: Atomic update
      const updatedResource = await Resource.findOneAndUpdate(
        {
          _id: new Types.ObjectId(resourceId),
          status: { $ne: 'INACTIVE' },
          availableQuantity: { $gte: data.quantity },
        },
        {
          $inc: { availableQuantity: -data.quantity },
        },
        {
          new: true,
          session: isTransactionActive ? session : undefined,
        }
      );

      if (!updatedResource) {
        // Inspect current state to provide precise failure reason
        const existing = await Resource.findById(resourceId);
        if (!existing) {
          throw AppError.notFound(`Resource not found with ID: ${resourceId}`);
        }
        if (existing.status === 'INACTIVE') {
          throw AppError.badRequest(`Resource '${existing.name}' is currently inactive`);
        }
        throw AppError.resourceInsufficient(
          `Insufficient quantity for '${existing.name}'. Requested: ${data.quantity}, Available: ${existing.availableQuantity}`,
          {
            resourceId,
            resourceName: existing.name,
            requested: data.quantity,
            available: existing.availableQuantity,
          }
        );
      }

      // Update resource status atomically based on remaining quantity
      const newStatus = this.calculateStatus(
        updatedResource.availableQuantity,
        updatedResource.totalQuantity
      );
      if (updatedResource.availableQuantity <= 0) {
        await Resource.findByIdAndUpdate(resourceId, { $set: { status: 'EXHAUSTED' } });
        updatedResource.status = 'EXHAUSTED';
      } else if (updatedResource.status !== newStatus) {
        await Resource.findByIdAndUpdate(resourceId, { $set: { status: newStatus } });
        updatedResource.status = newStatus;
      }

      // 2. Create allocation document
      const allocation = new ResourceAllocation({
        incidentId: incident._id,
        resourceId: updatedResource._id,
        quantity: data.quantity,
        allocatedBy: new Types.ObjectId(actorId),
        status: 'ALLOCATED',
        allocatedAt: new Date(),
        notes: data.notes,
      });

      if (isTransactionActive && session) {
        await allocation.save({ session });
      } else {
        await allocation.save();
      }

      // 3. Append to incident timeline
      await IncidentService.addTimelineEvent(
        incident._id,
        {
          eventType: 'RESOURCE_ALLOCATED',
          actorId,
          message: `Allocated ${data.quantity} ${updatedResource.unit} of ${updatedResource.name}`,
          metadata: {
            allocationId: allocation._id,
            resourceId: updatedResource._id,
            resourceName: updatedResource.name,
            quantity: data.quantity,
            unit: updatedResource.unit,
            remainingAvailable: updatedResource.availableQuantity,
          },
          createdAt: new Date(),
        },
        isTransactionActive ? session! : undefined
      );

      // 4. Record audit log
      await AuditService.record(
        {
          actorId,
          action: 'RESOURCE_ALLOCATED',
          entityType: 'RESOURCE_ALLOCATION',
          entityId: allocation._id,
          metadata: {
            incidentId: incident._id,
            resourceId: updatedResource._id,
            quantity: data.quantity,
          },
        },
        isTransactionActive ? session! : undefined
      );

      if (isTransactionActive && session) {
        await session.commitTransaction();
      }

      return allocation.populate([
        { path: 'resourceId' },
        { path: 'allocatedBy', select: 'name email role' },
      ]);
    } catch (error) {
      if (isTransactionActive && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  static async release(allocationId: string, actorId: string): Promise<IResourceAllocation> {
    if (!Types.ObjectId.isValid(allocationId)) {
      throw AppError.badRequest('Invalid allocation ID format');
    }

    const allocation = await ResourceAllocation.findById(allocationId).populate<{
      resourceId: IResource;
    }>('resourceId');

    if (!allocation) {
      throw AppError.notFound(`Allocation not found with ID: ${allocationId}`);
    }

    if (allocation.status !== 'ALLOCATED') {
      throw AppError.badRequest(`Allocation is already '${allocation.status}' and cannot be released`);
    }

    allocation.status = 'RELEASED';
    allocation.releasedAt = new Date();
    await allocation.save();

    // Increment resource availableQuantity back
    const resource = await Resource.findByIdAndUpdate(
      allocation.resourceId._id,
      { $inc: { availableQuantity: allocation.quantity } },
      { new: true }
    );

    if (resource && resource.status !== 'INACTIVE') {
      resource.status = this.calculateStatus(resource.availableQuantity, resource.totalQuantity);
      await resource.save();
    }

    // Incident timeline event
    await IncidentService.addTimelineEvent(allocation.incidentId, {
      eventType: 'RESOURCE_RELEASED',
      actorId,
      message: `Released ${allocation.quantity} ${allocation.resourceId.unit} of ${allocation.resourceId.name}`,
      metadata: {
        allocationId: allocation._id,
        resourceId: allocation.resourceId._id,
        quantity: allocation.quantity,
      },
      createdAt: new Date(),
    });

    // Audit log
    await AuditService.record({
      actorId,
      action: 'RESOURCE_RELEASED',
      entityType: 'RESOURCE_ALLOCATION',
      entityId: allocation._id,
      metadata: {
        incidentId: allocation.incidentId,
        resourceId: allocation.resourceId._id,
        quantity: allocation.quantity,
      },
    });

    return allocation as unknown as IResourceAllocation;
  }

  static async listAllocationsByIncident(incidentId: string): Promise<IResourceAllocation[]> {
    if (!Types.ObjectId.isValid(incidentId)) {
      throw AppError.badRequest('Invalid incident ID format');
    }

    return ResourceAllocation.find({ incidentId })
      .populate('resourceId')
      .populate('allocatedBy', 'name email role')
      .sort({ createdAt: -1 });
  }
}
