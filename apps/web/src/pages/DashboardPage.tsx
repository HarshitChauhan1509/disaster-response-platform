import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  Users,
  Box,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { DashboardSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  formatDate,
  getPriorityScoreColor,
  getSeverityBadgeColor,
  getStatusBadgeColor,
} from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data.data;
    },
    refetchInterval: 15000, // Real-time 15s polling
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">Failed to load dashboard metrics</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">Please check API connection and try again.</p>
        <Button size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { metrics, recentIncidents, criticalIncidents, respondersByStatus, resourcesByStatus } = data;

  const metricCards = [
    {
      label: 'Active Incidents',
      value: metrics.activeIncidents,
      sub: `${metrics.totalIncidents} total logged`,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Critical Incidents',
      value: metrics.criticalIncidents,
      sub: 'Immediate action needed',
      icon: Flame,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Available Responders',
      value: metrics.availableResponders,
      sub: `${metrics.assignedResponders} currently assigned`,
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Busy / In Action',
      value: metrics.busyResponders,
      sub: `${metrics.totalResponders} total responders`,
      icon: Users,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
    {
      label: 'Available Resources',
      value: metrics.availableResources,
      sub: `${metrics.totalResources} registered types`,
      icon: Box,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Low / Depleted Resources',
      value: metrics.lowOrExhaustedResources,
      sub: 'Replenishment alert',
      icon: Box,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Emergency Command Center</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Operational Overview & Field Telemetry • Auto-refreshing 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Feed
          </Button>
          <Link to="/incidents">
            <Button size="sm">Create Incident</Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="p-4 border-slate-800/90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 tracking-wide">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.bgColor} ${card.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">{card.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Main Grid: Critical Incidents & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Incidents Card */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-100">Critical & High Priority Incidents</h3>
            </div>
            <Link
              to="/incidents"
              className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-medium"
            >
              All incidents <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {criticalIncidents.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No critical incidents active.</p>
            ) : (
              criticalIncidents.map((inc) => (
                <Link
                  key={inc._id}
                  to={`/incidents/${inc._id}`}
                  className="block p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="custom"
                          className={`text-[10px] ${getSeverityBadgeColor(inc.severity)}`}
                        >
                          {inc.severity}
                        </Badge>
                        <Badge
                          variant="custom"
                          className={`text-[10px] ${getStatusBadgeColor(inc.status)}`}
                        >
                          {inc.status}
                        </Badge>
                        <span className="text-[11px] text-slate-400 font-mono truncate">{inc.type}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 truncate">{inc.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{inc.address}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${getPriorityScoreColor(
                          inc.priorityScore
                        )}`}
                      >
                        P-{inc.priorityScore}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {inc.affectedPeople} affected
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent Incidents Card */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">Latest Reported Incidents</h3>
            </div>
            <Link
              to="/incidents"
              className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-medium"
            >
              View table <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentIncidents.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent incidents reported.</p>
            ) : (
              recentIncidents.map((inc) => (
                <Link
                  key={inc._id}
                  to={`/incidents/${inc._id}`}
                  className="block p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="custom"
                          className={`text-[10px] ${getSeverityBadgeColor(inc.severity)}`}
                        >
                          {inc.severity}
                        </Badge>
                        <Badge
                          variant="custom"
                          className={`text-[10px] ${getStatusBadgeColor(inc.status)}`}
                        >
                          {inc.status}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDate(inc.createdAt)}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 truncate">{inc.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{inc.address}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${getPriorityScoreColor(
                          inc.priorityScore
                        )}`}
                      >
                        P-{inc.priorityScore}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Resource & Responder Availability Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Responder Status Breakdown */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Responder Fleet Readiness
            </h3>
            <Link to="/responders" className="text-xs text-emerald-400 hover:text-emerald-300">
              Manage fleet &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-emerald-400 font-bold text-lg">{respondersByStatus.AVAILABLE || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Available</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-sky-400 font-bold text-lg">{respondersByStatus.ASSIGNED || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Assigned</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-orange-400 font-bold text-lg">{respondersByStatus.BUSY || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Busy</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-slate-500 font-bold text-lg">{respondersByStatus.OFF_DUTY || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Off Duty</div>
            </div>
          </div>
        </Card>

        {/* Resources Status Breakdown */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Emergency Inventory Status
            </h3>
            <Link to="/resources" className="text-xs text-emerald-400 hover:text-emerald-300">
              Stockpile details &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-emerald-400 font-bold text-lg">{resourcesByStatus.AVAILABLE || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Optimal</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-yellow-400 font-bold text-lg">{resourcesByStatus.LOW || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Low</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-red-400 font-bold text-lg">{resourcesByStatus.EXHAUSTED || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Depleted</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-slate-500 font-bold text-lg">{resourcesByStatus.INACTIVE || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Inactive</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
