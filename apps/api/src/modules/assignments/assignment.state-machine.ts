import { AppError } from '../../shared/errors/app-error.js';

export type AssignmentStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export class AssignmentStateMachine {
  private static readonly transitions: Record<AssignmentStatus, AssignmentStatus[]> = {
    PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  public static readonly activeStatuses: AssignmentStatus[] = [
    'PENDING',
    'ACCEPTED',
    'IN_PROGRESS',
  ];

  static canTransition(current: AssignmentStatus, next: AssignmentStatus): boolean {
    if (current === next) return true;
    const allowed = this.transitions[current] || [];
    return allowed.includes(next);
  }

  static validateTransition(current: AssignmentStatus, next: AssignmentStatus): void {
    if (!this.canTransition(current, next)) {
      const allowed = this.transitions[current] || [];
      throw AppError.invalidStatusTransition(current, next, {
        currentStatus: current,
        requestedStatus: next,
        allowedTransitions: allowed,
      });
    }
  }

  static getAllowedTransitions(current: AssignmentStatus): AssignmentStatus[] {
    return this.transitions[current] || [];
  }

  static isActive(status: AssignmentStatus): boolean {
    return this.activeStatuses.includes(status);
  }
}
