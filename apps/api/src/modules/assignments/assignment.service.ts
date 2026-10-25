import { Types } from 'mongoose';
import { Assignment, IAssignment } from './assignment.model.js';
import { AssignmentStateMachine, AssignmentStatus } from './assignment.state-machine.js';
import { Incident } from '../incidents/incident.model.js';
import { Responder } from '../responders/responder.model.js';
import { IncidentStateMachine } from '../incidents/incident.state-machine.js';
import { IncidentService } from '../incidents/incident.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AuthUser } from '../../shared/types/common.types.js';

export interface CreateAssignmentData {
  incidentId: string;
  responderId: string;
  notes?: string;
}

export class AssignmentService {
  static async create(data: CreateAssignmentData, actorId: string): Promise<IAssignment> {
    if (!Types.ObjectId.isValid(data.incidentId)) {
      throw AppError.badRequest('Invalid incident ID format');
    }
    if (!Types.ObjectId.isValid(data.responderId)) {
      throw AppError.badRequest('Invalid responder ID format');
    }

    // 1. Incident must exist and be assignable
    const incident = await Incident.findById(data.incidentId);
    if (!incident) {
      throw AppError.notFound(`Incident not found with ID: ${data.incidentId}`);
    }

    if (!IncidentStateMachine.isAssignable(incident.status)) {
      throw AppError.badRequest(
        `Cannot assign responders to incident with status '${incident.status}'. Incident must be in VERIFIED, ACTIVE, or CONTAINED status.`
      );
    }

    // 2. Responder must exist and be active
    const responder = await Responder.findById(data.responderId).populate('userId');
    if (!responder) {
      throw AppError.notFound(`Responder not found with ID: ${data.responderId}`);
    }

    const responderUser = responder.userId as unknown as { isActive?: boolean; name?: string };
    if (!responderUser || responderUser.isActive === false) {
      throw AppError.badRequest('Cannot assign an inactive responder');
    }

    if (responder.status !== 'AVAILABLE') {
      throw AppError.responderUnavailable(
        `Responder is currently '${responder.status}' and cannot receive new assignments`
      );
    }

    // 3. Prevent conflicting active assignments
    const activeAssignment = await Assignment.findOne({
      responderId: responder._id,
      status: { $in: AssignmentStateMachine.activeStatuses },
    });

    if (activeAssignment) {
      throw AppError.activeAssignmentExists(
        `Responder already has an active assignment (${activeAssignment.status}) on incident: ${activeAssignment.incidentId}`
      );
    }

    // 4. Validate skill match if required skills exist
    if (incident.requiredSkills && incident.requiredSkills.length > 0) {
      const hasMatchingSkill = incident.requiredSkills.some((reqSkill) =>
        responder.skills.includes(reqSkill)
      );

      if (!hasMatchingSkill) {
        throw AppError.skillMismatch(incident.requiredSkills, responder.skills);
      }
    }

    // 5. Create assignment
    const assignment = await Assignment.create({
      incidentId: incident._id,
      responderId: responder._id,
      status: 'PENDING',
      assignedBy: new Types.ObjectId(actorId),
      assignedAt: new Date(),
      notes: data.notes,
    });

    // 6. Update responder status to ASSIGNED
    responder.status = 'ASSIGNED';
    await responder.save();

    // 7. Update incident timeline
    await IncidentService.addTimelineEvent(incident._id, {
      eventType: 'RESPONDER_ASSIGNED',
      actorId,
      message: `Assigned responder ${responderUser.name || 'Responder'} (${responder.skills.join(', ')})`,
      metadata: {
        assignmentId: assignment._id,
        responderId: responder._id,
        skills: responder.skills,
      },
      createdAt: new Date(),
    });

    // 8. Record audit log
    await AuditService.record({
      actorId,
      action: 'RESPONDER_ASSIGNED',
      entityType: 'ASSIGNMENT',
      entityId: assignment._id,
      metadata: {
        incidentId: incident._id,
        responderId: responder._id,
      },
    });

    return assignment.populate([
      { path: 'responderId', populate: { path: 'userId', select: 'name email role' } },
      { path: 'assignedBy', select: 'name email role' },
    ]);
  }

  static async updateStatus(
    assignmentId: string,
    newStatus: AssignmentStatus,
    notes: string | undefined,
    user: AuthUser
  ): Promise<IAssignment> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw AppError.badRequest('Invalid assignment ID format');
    }

    const assignment = await Assignment.findById(assignmentId).populate<{
      responderId: { _id: Types.ObjectId; userId: Types.ObjectId; status: string; save: () => Promise<void> };
    }>('responderId');

    if (!assignment) {
      throw AppError.notFound(`Assignment not found with ID: ${assignmentId}`);
    }

    // RBAC logic for status updates:
    // If user is RESPONDER, they can only accept/reject/start/complete their own assignment
    if (user.role === 'RESPONDER') {
      const responderUserObjId = assignment.responderId.userId.toString();
      if (responderUserObjId !== user.id) {
        throw AppError.forbidden('You can only update assignments assigned to you');
      }
    }

    // Validate state machine transition
    AssignmentStateMachine.validateTransition(assignment.status, newStatus);

    const oldStatus = assignment.status;
    assignment.status = newStatus;
    if (notes) {
      assignment.notes = assignment.notes ? `${assignment.notes} | ${notes}` : notes;
    }

    if (newStatus === 'ACCEPTED') {
      assignment.acceptedAt = new Date();
    } else if (newStatus === 'COMPLETED') {
      assignment.completedAt = new Date();
    }

    await assignment.save();

    // Check if responder has any remaining active assignments
    const remainingActive = await Assignment.countDocuments({
      responderId: assignment.responderId._id,
      status: { $in: AssignmentStateMachine.activeStatuses },
    });

    const responderDoc = await Responder.findById(assignment.responderId._id);
    if (responderDoc) {
      if (remainingActive === 0) {
        responderDoc.status = 'AVAILABLE';
        await responderDoc.save();
      } else if (newStatus === 'IN_PROGRESS') {
        responderDoc.status = 'BUSY';
        await responderDoc.save();
      }
    }

    // Timeline event if cancelled or rejected
    if (newStatus === 'CANCELLED' || newStatus === 'REJECTED') {
      await IncidentService.addTimelineEvent(assignment.incidentId, {
        eventType: 'RESPONDER_REMOVED',
        actorId: user.id,
        message: `Assignment ${assignment._id} transitioned to ${newStatus}`,
        metadata: { assignmentId: assignment._id, status: newStatus },
        createdAt: new Date(),
      });
    }

    // Audit log
    await AuditService.record({
      actorId: user.id,
      action: 'ASSIGNMENT_STATUS_CHANGED',
      entityType: 'ASSIGNMENT',
      entityId: assignment._id,
      metadata: { oldStatus, newStatus, notes },
    });

    return assignment.populate([
      { path: 'responderId', populate: { path: 'userId', select: 'name email role' } },
      { path: 'assignedBy', select: 'name email role' },
    ]);
  }

  static async listByIncident(incidentId: string): Promise<IAssignment[]> {
    if (!Types.ObjectId.isValid(incidentId)) {
      throw AppError.badRequest('Invalid incident ID format');
    }

    return Assignment.find({ incidentId })
      .populate({ path: 'responderId', populate: { path: 'userId', select: 'name email role' } })
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 });
  }

  static async listMyAssignments(userId: string): Promise<IAssignment[]> {
    const responder = await Responder.findOne({ userId });
    if (!responder) {
      return [];
    }

    return Assignment.find({ responderId: responder._id })
      .populate('incidentId')
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 });
  }
}
