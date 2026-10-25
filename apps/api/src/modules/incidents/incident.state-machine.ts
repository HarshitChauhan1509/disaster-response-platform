import { IncidentStatus } from './incident.types.js';
import { AppError } from '../../shared/errors/app-error.js';

export class IncidentStateMachine {
  private static readonly transitions: Record<IncidentStatus, IncidentStatus[]> = {
    REPORTED: ['VERIFIED', 'REJECTED', 'CANCELLED'],
    VERIFIED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['CONTAINED', 'CANCELLED'],
    CONTAINED: ['RESOLVED', 'ACTIVE', 'CANCELLED'],
    RESOLVED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  /**
   * Statuses where the incident can receive active responder assignments and resources.
   */
  private static readonly assignableStatuses: Set<IncidentStatus> = new Set([
    'VERIFIED',
    'ACTIVE',
    'CONTAINED',
  ]);

  static canTransition(current: IncidentStatus, next: IncidentStatus): boolean {
    if (current === next) return true;
    const allowed = this.transitions[current] || [];
    return allowed.includes(next);
  }

  static validateTransition(current: IncidentStatus, next: IncidentStatus): void {
    if (!this.canTransition(current, next)) {
      const allowed = this.transitions[current] || [];
      throw AppError.invalidStatusTransition(current, next, {
        currentStatus: current,
        requestedStatus: next,
        allowedTransitions: allowed,
      });
    }
  }

  static getAllowedTransitions(current: IncidentStatus): IncidentStatus[] {
    return this.transitions[current] || [];
  }

  static isAssignable(status: IncidentStatus): boolean {
    return this.assignableStatuses.has(status);
  }
}
