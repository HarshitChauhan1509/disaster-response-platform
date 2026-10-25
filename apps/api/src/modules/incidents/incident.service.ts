import { ClientSession, Types } from 'mongoose';
import { Incident, IIncident } from './incident.model.js';
import {
  CreateIncidentInput,
  QueryIncidentsInput,
  UpdateIncidentInput,
} from './incident.schemas.js';
import { calculatePriorityScore } from './incident.priority.js';
import { IncidentStateMachine } from './incident.state-machine.js';
import { IncidentStatus, ITimelineEvent } from './incident.types.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuditService } from '../audit/audit.service.js';
import { PaginatedResult } from '../../shared/types/common.types.js';

export class IncidentService {
  static async create(data: CreateIncidentInput, actorId: string): Promise<IIncident> {
    const priorityScore = calculatePriorityScore({
      severity: data.severity,
      affectedPeople: data.affectedPeople,
      requiredSkills: data.requiredSkills,
      type: data.type,
    });

    const initialTimeline: ITimelineEvent[] = [
      {
        eventType: 'INCIDENT_CREATED',
        actorId,
        message: `Incident created with severity ${data.severity} and priority ${priorityScore}`,
        metadata: {
          severity: data.severity,
          priorityScore,
          affectedPeople: data.affectedPeople,
        },
        createdAt: new Date(),
      },
    ];

    const incident = await Incident.create({
      ...data,
      priorityScore,
      reportedBy: new Types.ObjectId(actorId),
      status: 'REPORTED',
      timeline: initialTimeline,
    });

    // Record audit log
    await AuditService.record({
      actorId,
      action: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: incident._id,
      metadata: {
        title: incident.title,
        severity: incident.severity,
        priorityScore,
      },
    });

    return incident;
  }

  static async list(filter: QueryIncidentsInput): Promise<PaginatedResult<IIncident>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.severity) {
      query.severity = filter.severity;
    }
    if (filter.type) {
      query.type = filter.type;
    }
    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { address: searchRegex },
      ];
    }

    const sortField = filter.sort || 'priorityScore';
    const sortDir = filter.order === 'asc' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortDir };
    if (sortField !== 'createdAt') {
      sortObj.createdAt = -1;
    }

    const [items, total] = await Promise.all([
      Incident.find(query)
        .populate('reportedBy', 'name email role')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Incident.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items as unknown as IIncident[],
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

  static async getById(id: string): Promise<IIncident> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid incident ID format');
    }

    const incident = await Incident.findById(id).populate('reportedBy', 'name email role');
    if (!incident) {
      throw AppError.notFound(`Incident not found with ID: ${id}`);
    }

    return incident;
  }

  static async update(id: string, data: UpdateIncidentInput, actorId: string): Promise<IIncident> {
    const incident = await this.getById(id);

    // If critical factors change, recalculate priority
    const severity = data.severity ?? incident.severity;
    const affectedPeople = data.affectedPeople ?? incident.affectedPeople;
    const requiredSkills = data.requiredSkills ?? incident.requiredSkills;
    const type = data.type ?? incident.type;

    const newPriority = calculatePriorityScore({
      severity,
      affectedPeople,
      requiredSkills,
      type,
    });

    if (newPriority !== incident.priorityScore) {
      incident.timeline.push({
        eventType: 'PRIORITY_CHANGED',
        actorId,
        message: `Priority score updated from ${incident.priorityScore} to ${newPriority}`,
        metadata: { oldPriority: incident.priorityScore, newPriority },
        createdAt: new Date(),
      });
      incident.priorityScore = newPriority;
    }

    Object.assign(incident, data);
    await incident.save();

    await AuditService.record({
      actorId,
      action: 'INCIDENT_UPDATED',
      entityType: 'INCIDENT',
      entityId: incident._id,
      metadata: { changedFields: Object.keys(data), priorityScore: incident.priorityScore },
    });

    return incident;
  }

  static async changeStatus(
    id: string,
    newStatus: IncidentStatus,
    message: string | undefined,
    actorId: string
  ): Promise<IIncident> {
    const incident = await this.getById(id);

    IncidentStateMachine.validateTransition(incident.status, newStatus);

    const oldStatus = incident.status;
    incident.status = newStatus;

    incident.timeline.push({
      eventType: 'STATUS_CHANGED',
      actorId,
      message: message || `Status transitioned from ${oldStatus} to ${newStatus}`,
      metadata: { oldStatus, newStatus },
      createdAt: new Date(),
    });

    await incident.save();

    await AuditService.record({
      actorId,
      action: 'INCIDENT_STATUS_CHANGED',
      entityType: 'INCIDENT',
      entityId: incident._id,
      metadata: { oldStatus, newStatus, message },
    });

    return incident;
  }

  static async addTimelineEvent(
    incidentId: string | Types.ObjectId,
    event: ITimelineEvent,
    session?: ClientSession
  ): Promise<void> {
    if (session) {
      await Incident.findByIdAndUpdate(
        incidentId,
        { $push: { timeline: event } },
        { session }
      );
    } else {
      await Incident.findByIdAndUpdate(
        incidentId,
        { $push: { timeline: event } }
      );
    }
  }
}
