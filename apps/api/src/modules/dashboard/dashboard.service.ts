import { Incident } from '../incidents/incident.model.js';
import { Responder } from '../responders/responder.model.js';
import { Resource } from '../resources/resource.model.js';

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
  recentIncidents: unknown[];
  criticalIncidents: unknown[];
  respondersByStatus: Record<string, number>;
  resourcesByStatus: Record<string, number>;
}

export class DashboardService {
  static async getSummary(): Promise<DashboardSummary> {
    const [
      activeIncidents,
      criticalIncidentsCount,
      totalIncidents,
      recentIncidents,
      criticalIncidentsList,
      responderStatusCounts,
      resourceStatusCounts,
      totalResources,
      availableResourcesCount,
      lowOrExhaustedResourcesCount,
    ] = await Promise.all([
      // 1. Active incidents count
      Incident.countDocuments({ status: { $in: ['REPORTED', 'VERIFIED', 'ACTIVE', 'CONTAINED'] } }),

      // 2. Critical incidents count (active + critical)
      Incident.countDocuments({
        status: { $in: ['REPORTED', 'VERIFIED', 'ACTIVE', 'CONTAINED'] },
        severity: 'CRITICAL',
      }),

      // 3. Total incidents
      Incident.countDocuments(),

      // 4. Recent incidents (top 5 by createdAt)
      Incident.find()
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 5. Critical incidents (top 5 by priorityScore)
      Incident.find({
        status: { $in: ['REPORTED', 'VERIFIED', 'ACTIVE', 'CONTAINED'] },
      })
        .populate('reportedBy', 'name email')
        .sort({ priorityScore: -1 })
        .limit(5)
        .lean(),

      // 6. Responders aggregation by status
      Responder.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // 7. Resources aggregation by status
      Resource.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // 8. Total resources
      Resource.countDocuments(),

      // 9. Available resources
      Resource.countDocuments({ status: 'AVAILABLE' }),

      // 10. Low or Exhausted resources
      Resource.countDocuments({ status: { $in: ['LOW', 'EXHAUSTED'] } }),
    ]);

    const respondersByStatus: Record<string, number> = {
      AVAILABLE: 0,
      ASSIGNED: 0,
      BUSY: 0,
      OFF_DUTY: 0,
    };
    let totalResponders = 0;
    for (const group of responderStatusCounts) {
      if (group._id) {
        respondersByStatus[group._id] = group.count;
        totalResponders += group.count;
      }
    }

    const resourcesByStatus: Record<string, number> = {
      AVAILABLE: 0,
      LOW: 0,
      EXHAUSTED: 0,
      INACTIVE: 0,
    };
    for (const group of resourceStatusCounts) {
      if (group._id) {
        resourcesByStatus[group._id] = group.count;
      }
    }

    return {
      metrics: {
        activeIncidents,
        criticalIncidents: criticalIncidentsCount,
        totalIncidents,
        availableResponders: respondersByStatus.AVAILABLE || 0,
        busyResponders: respondersByStatus.BUSY || 0,
        assignedResponders: respondersByStatus.ASSIGNED || 0,
        totalResponders,
        totalResources,
        availableResources: availableResourcesCount,
        lowOrExhaustedResources: lowOrExhaustedResourcesCount,
      },
      recentIncidents,
      criticalIncidents: criticalIncidentsList,
      respondersByStatus,
      resourcesByStatus,
    };
  }
}
