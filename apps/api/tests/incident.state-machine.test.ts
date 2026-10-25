import { IncidentStateMachine } from '../src/modules/incidents/incident.state-machine.js';
import { calculatePriorityScore } from '../src/modules/incidents/incident.priority.js';
import { AppError } from '../src/shared/errors/app-error.js';
import { IncidentStatus } from '../src/modules/incidents/incident.types.js';

describe('Incident State Machine & Priority Heuristic', () => {
  describe('IncidentStateMachine Transitions', () => {
    it('allows valid primary lifecycle transitions', () => {
      expect(IncidentStateMachine.canTransition('REPORTED', 'VERIFIED')).toBe(true);
      expect(IncidentStateMachine.canTransition('VERIFIED', 'ACTIVE')).toBe(true);
      expect(IncidentStateMachine.canTransition('ACTIVE', 'CONTAINED')).toBe(true);
      expect(IncidentStateMachine.canTransition('CONTAINED', 'RESOLVED')).toBe(true);
    });

    it('allows re-escalation from CONTAINED back to ACTIVE', () => {
      expect(IncidentStateMachine.canTransition('CONTAINED', 'ACTIVE')).toBe(true);
    });

    it('allows cancellation from early/active states', () => {
      expect(IncidentStateMachine.canTransition('REPORTED', 'CANCELLED')).toBe(true);
      expect(IncidentStateMachine.canTransition('VERIFIED', 'CANCELLED')).toBe(true);
      expect(IncidentStateMachine.canTransition('ACTIVE', 'CANCELLED')).toBe(true);
      expect(IncidentStateMachine.canTransition('CONTAINED', 'CANCELLED')).toBe(true);
    });

    it('allows rejection only from REPORTED state', () => {
      expect(IncidentStateMachine.canTransition('REPORTED', 'REJECTED')).toBe(true);
      expect(IncidentStateMachine.canTransition('VERIFIED', 'REJECTED')).toBe(false);
      expect(IncidentStateMachine.canTransition('ACTIVE', 'REJECTED')).toBe(false);
    });

    it('rejects invalid state jumps like REPORTED -> ACTIVE', () => {
      expect(IncidentStateMachine.canTransition('REPORTED', 'ACTIVE')).toBe(false);
      expect(() => {
        IncidentStateMachine.validateTransition('REPORTED', 'ACTIVE');
      }).toThrow(AppError);
    });

    it('rejects transitions out of terminal states (RESOLVED, REJECTED, CANCELLED)', () => {
      expect(IncidentStateMachine.canTransition('RESOLVED', 'ACTIVE')).toBe(false);
      expect(IncidentStateMachine.canTransition('REJECTED', 'VERIFIED')).toBe(false);
      expect(IncidentStateMachine.canTransition('CANCELLED', 'ACTIVE')).toBe(false);
    });

    it('correctly identifies assignable statuses', () => {
      expect(IncidentStateMachine.isAssignable('VERIFIED')).toBe(true);
      expect(IncidentStateMachine.isAssignable('ACTIVE')).toBe(true);
      expect(IncidentStateMachine.isAssignable('CONTAINED')).toBe(true);
      expect(IncidentStateMachine.isAssignable('REPORTED')).toBe(false);
      expect(IncidentStateMachine.isAssignable('RESOLVED')).toBe(false);
      expect(IncidentStateMachine.isAssignable('CANCELLED')).toBe(false);
    });
  });

  describe('Deterministic Priority Calculation', () => {
    it('calculates deterministic priority based on severity, population, skills, and type', () => {
      const score1 = calculatePriorityScore({
        severity: 'CRITICAL',
        affectedPeople: 500,
        requiredSkills: ['MEDICAL', 'WATER_RESCUE'],
        type: 'FLOOD',
      });

      // 50 (CRITICAL) + 20 (>=200) + 10 (2 skills * 5) = 80
      expect(score1).toBe(80);

      // Same inputs must yield exact same score
      const score2 = calculatePriorityScore({
        severity: 'CRITICAL',
        affectedPeople: 500,
        requiredSkills: ['MEDICAL', 'WATER_RESCUE'],
        type: 'FLOOD',
      });
      expect(score1).toBe(score2);
    });

    it('adds bonus for high-risk incident types (BUILDING_COLLAPSE, CYCLONE, FIRE)', () => {
      const floodScore = calculatePriorityScore({
        severity: 'HIGH',
        affectedPeople: 50,
        requiredSkills: ['FIRE'],
        type: 'OTHER',
      });

      const fireScore = calculatePriorityScore({
        severity: 'HIGH',
        affectedPeople: 50,
        requiredSkills: ['FIRE'],
        type: 'FIRE',
      });

      expect(fireScore - floodScore).toBe(5);
    });

    it('clamps priority score within [1, 100]', () => {
      const maxScore = calculatePriorityScore({
        severity: 'CRITICAL',
        affectedPeople: 5000,
        requiredSkills: ['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE'],
        type: 'BUILDING_COLLAPSE',
      });
      expect(maxScore).toBeLessThanOrEqual(100);

      const minScore = calculatePriorityScore({
        severity: 'LOW',
        affectedPeople: 0,
        requiredSkills: [],
        type: 'OTHER',
      });
      expect(minScore).toBeGreaterThanOrEqual(1);
    });
  });
});
