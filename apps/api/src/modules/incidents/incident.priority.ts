import { IncidentSeverity, IncidentType, ResponderSkill } from './incident.types.js';

export interface PriorityFactors {
  severity: IncidentSeverity;
  affectedPeople: number;
  requiredSkills: ResponderSkill[];
  type: IncidentType;
}

/**
 * Deterministic, explainable heuristic for incident prioritization (1 - 100).
 *
 * Factors:
 * 1. Severity weight:
 *    - CRITICAL: 50
 *    - HIGH: 35
 *    - MEDIUM: 20
 *    - LOW: 10
 *
 * 2. Affected population weight:
 *    - >= 1000: 30
 *    - >= 200:  20
 *    - >= 50:   10
 *    - > 0:      5
 *    - 0:        0
 *
 * 3. Required skills / complexity weight:
 *    - min(15, requiredSkills.length * 5)
 *
 * 4. High-risk incident type bonus:
 *    - BUILDING_COLLAPSE, CYCLONE, FIRE: +5
 *
 * Result clamped to [1, 100].
 */
export function calculatePriorityScore(factors: PriorityFactors): number {
  let score = 0;

  // 1. Severity
  switch (factors.severity) {
    case 'CRITICAL':
      score += 50;
      break;
    case 'HIGH':
      score += 35;
      break;
    case 'MEDIUM':
      score += 20;
      break;
    case 'LOW':
      score += 10;
      break;
  }

  // 2. Affected Population
  const affected = Math.max(0, factors.affectedPeople || 0);
  if (affected >= 1000) {
    score += 30;
  } else if (affected >= 200) {
    score += 20;
  } else if (affected >= 50) {
    score += 10;
  } else if (affected > 0) {
    score += 5;
  }

  // 3. Complexity / Required skills
  const skillsCount = factors.requiredSkills ? factors.requiredSkills.length : 0;
  score += Math.min(15, skillsCount * 5);

  // 4. Incident Type Urgency
  if (['BUILDING_COLLAPSE', 'CYCLONE', 'FIRE'].includes(factors.type)) {
    score += 5;
  }

  return Math.min(100, Math.max(1, score));
}
