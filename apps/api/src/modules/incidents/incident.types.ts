export type IncidentType =
  | 'FLOOD'
  | 'EARTHQUAKE'
  | 'FIRE'
  | 'BUILDING_COLLAPSE'
  | 'CYCLONE'
  | 'MEDICAL'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'REPORTED'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'CONTAINED'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ResponderSkill =
  | 'MEDICAL'
  | 'FIRE'
  | 'SEARCH_AND_RESCUE'
  | 'ENGINEERING'
  | 'DRIVER'
  | 'WATER_RESCUE';

export type TimelineEventType =
  | 'INCIDENT_CREATED'
  | 'STATUS_CHANGED'
  | 'RESPONDER_ASSIGNED'
  | 'RESPONDER_REMOVED'
  | 'RESOURCE_ALLOCATED'
  | 'RESOURCE_RELEASED'
  | 'PRIORITY_CHANGED';

export interface ITimelineEvent {
  eventType: TimelineEventType;
  actorId: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
