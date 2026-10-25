export type UserRole = 'ADMIN' | 'COORDINATOR' | 'RESPONDER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

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

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface TimelineEvent {
  eventType: string;
  actorId: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Incident {
  _id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedPeople: number;
  location: GeoPoint;
  address: string;
  requiredSkills: ResponderSkill[];
  priorityScore: number;
  reportedBy: User | string;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type ResponderStatus = 'AVAILABLE' | 'ASSIGNED' | 'BUSY' | 'OFF_DUTY';

export interface Responder {
  _id: string;
  userId: User;
  skills: ResponderSkill[];
  status: ResponderStatus;
  location: GeoPoint;
  organization: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Assignment {
  _id: string;
  incidentId: Incident | string;
  responderId: Responder;
  status: AssignmentStatus;
  assignedBy: User;
  assignedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType =
  | 'MEDICAL'
  | 'FOOD'
  | 'WATER'
  | 'VEHICLE'
  | 'SHELTER'
  | 'EQUIPMENT'
  | 'OTHER';

export type ResourceStatus = 'AVAILABLE' | 'LOW' | 'EXHAUSTED' | 'INACTIVE';

export interface Resource {
  _id: string;
  name: string;
  type: ResourceType;
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  location: GeoPoint;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export type AllocationStatus = 'ALLOCATED' | 'RELEASED' | 'CANCELLED';

export interface ResourceAllocation {
  _id: string;
  incidentId: string;
  resourceId: Resource;
  quantity: number;
  allocatedBy: User;
  status: AllocationStatus;
  allocatedAt: string;
  releasedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: User;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface DashboardSummary {
  metrics: {
    activeIncidents: number;
    criticalIncidents: number;
    totalIncidents: number;
    availableResponders: number;
    busyResponders: number;
    assignedResponders: number;
    totalResponders: number;
    totalResources: number;
    availableResources: number;
    lowOrExhaustedResources: number;
  };
  recentIncidents: Incident[];
  criticalIncidents: Incident[];
  respondersByStatus: Record<string, number>;
  resourcesByStatus: Record<string, number>;
}
