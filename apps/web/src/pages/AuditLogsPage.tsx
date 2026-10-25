import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { AuditLog, PaginatedResult } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  const { data, isLoading, error } = useQuery<PaginatedResult<AuditLog>>({
    queryKey: ['audit-logs', page, actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entityType', entityFilter);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      return res.data.data;
    },
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (action.includes('ALLOCATED')) return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    if (action.includes('RELEASED')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    if (action.includes('STATUS')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (action.includes('ASSIGNED')) return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
    return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">System Audit & Traceability Ledger</h2>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Immutable, append-only operational audit history across all disaster dispatch actions
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Audit Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="INCIDENT_CREATED">INCIDENT_CREATED</option>
            <option value="INCIDENT_UPDATED">INCIDENT_UPDATED</option>
            <option value="INCIDENT_STATUS_CHANGED">INCIDENT_STATUS_CHANGED</option>
            <option value="RESPONDER_CREATED">RESPONDER_CREATED</option>
            <option value="RESPONDER_ASSIGNED">RESPONDER_ASSIGNED</option>
            <option value="ASSIGNMENT_STATUS_CHANGED">ASSIGNMENT_STATUS_CHANGED</option>
            <option value="RESOURCE_CREATED">RESOURCE_CREATED</option>
            <option value="RESOURCE_ALLOCATED">RESOURCE_ALLOCATED</option>
            <option value="RESOURCE_RELEASED">RESOURCE_RELEASED</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Entity Types</option>
            <option value="INCIDENT">INCIDENT</option>
            <option value="RESPONDER">RESPONDER</option>
            <option value="ASSIGNMENT">ASSIGNMENT</option>
            <option value="RESOURCE">RESOURCE</option>
            <option value="RESOURCE_ALLOCATION">RESOURCE_ALLOCATION</option>
            <option value="USER">USER</option>
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden border-slate-800">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-xs">Failed to load audit logs.</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No audit records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Operation Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {data?.items.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-sans font-medium">
                        {log.actorId?.name || 'Unknown User'}
                      </div>
                      <div className="text-[10px] text-slate-500">{log.actorId?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="custom"
                        className={`text-[9px] ${getActionBadgeColor(log.action)}`}
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[120px] truncate">
                      {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm truncate text-[10px]">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs">
            <span className="text-slate-400 font-mono">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} records)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPrevPage}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.pagination.hasNextPage}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
