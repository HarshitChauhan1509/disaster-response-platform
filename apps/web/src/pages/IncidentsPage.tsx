import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { Incident, PaginatedResult } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  formatDate,
  getPriorityScoreColor,
  getSeverityBadgeColor,
  getStatusBadgeColor,
} from '../lib/utils';

const newIncidentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  type: z.enum(['FLOOD', 'EARTHQUAKE', 'FIRE', 'BUILDING_COLLAPSE', 'CYCLONE', 'MEDICAL', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedPeople: z.coerce.number().min(0, 'Affected people cannot be negative'),
  address: z.string().min(2, 'Address is required'),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  requiredSkills: z.array(z.string()).default([]),
});

type NewIncidentFormData = z.infer<typeof newIncidentSchema>;

export const IncidentsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortField, setSortField] = useState<string>('priorityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewIncidentFormData>({
    resolver: zodResolver(newIncidentSchema),
    defaultValues: {
      type: 'FLOOD',
      severity: 'HIGH',
      affectedPeople: 50,
      longitude: 77.5946,
      latitude: 12.9716,
      requiredSkills: ['MEDICAL', 'WATER_RESCUE'],
    },
  });

  // Query Incidents List
  const { data, isLoading, error } = useQuery<PaginatedResult<Incident>>({
    queryKey: ['incidents', page, search, statusFilter, severityFilter, typeFilter, sortField, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (typeFilter) params.append('type', typeFilter);
      params.append('sort', sortField);
      params.append('order', sortOrder);

      const res = await api.get(`/incidents?${params.toString()}`);
      return res.data.data;
    },
  });

  // Create Incident Mutation
  const createMutation = useMutation({
    mutationFn: async (formData: NewIncidentFormData) => {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        severity: formData.severity,
        affectedPeople: formData.affectedPeople,
        address: formData.address,
        location: {
          type: 'Point',
          coordinates: [formData.longitude, formData.latitude],
        },
        requiredSkills: formData.requiredSkills,
      };
      const res = await api.post('/incidents', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsCreateModalOpen(false);
      reset();
      setFormError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to create incident.';
      setFormError(msg);
    },
  });

  const onSubmit = (formData: NewIncidentFormData) => {
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Disaster Incidents Directory</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Active emergencies, field triage and operational status
          </p>
        </div>

        {hasRole('ADMIN', 'COORDINATOR') && (
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Report New Incident
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="VERIFIED">Verified</option>
            <option value="ACTIVE">Active</option>
            <option value="CONTAINED">Contained</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Disaster Types</option>
            <option value="FLOOD">Flood</option>
            <option value="EARTHQUAKE">Earthquake</option>
            <option value="FIRE">Fire</option>
            <option value="BUILDING_COLLAPSE">Building Collapse</option>
            <option value="CYCLONE">Cyclone</option>
            <option value="MEDICAL">Medical Emergency</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Sort By */}
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('-');
              setSortField(f);
              setSortOrder(o as 'asc' | 'desc');
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="priorityScore-desc">Priority: High to Low</option>
            <option value="priorityScore-asc">Priority: Low to High</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="affectedPeople-desc">Affected Population</option>
          </select>
        </div>
      </Card>

      {/* Incidents Table / List */}
      <Card className="overflow-hidden border-slate-800">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-xs">Failed to load incidents.</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No incidents found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Incident Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Affected</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.items.map((inc) => (
                  <tr key={inc._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityScoreColor(
                          inc.priorityScore
                        )}`}
                      >
                        P-{inc.priorityScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <Link
                        to={`/incidents/${inc._id}`}
                        className="font-semibold text-slate-200 hover:text-emerald-400 transition-colors block truncate"
                      >
                        {inc.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{inc.address}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{inc.type}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="custom"
                        className={`text-[10px] ${getSeverityBadgeColor(inc.severity)}`}
                      >
                        {inc.severity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="custom"
                        className={`text-[10px] ${getStatusBadgeColor(inc.status)}`}
                      >
                        {inc.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{inc.affectedPeople}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDate(inc.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link to={`/incidents/${inc._id}`}>
                        <Button variant="secondary" size="sm" className="text-xs">
                          Manage
                        </Button>
                      </Link>
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
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
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

      {/* Create Incident Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Report New Disaster Incident"
        description="Submit incident telemetry. Priority is calculated deterministically."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <Input
            label="Incident Title"
            placeholder="e.g. Flash Flood Near Eastern Highway"
            error={errors.title?.message}
            {...register('title')}
          />

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              rows={3}
              placeholder="Provide situational details, hazards, casualties..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Disaster Type"
              options={[
                { value: 'FLOOD', label: 'Flood' },
                { value: 'EARTHQUAKE', label: 'Earthquake' },
                { value: 'FIRE', label: 'Fire' },
                { value: 'BUILDING_COLLAPSE', label: 'Building Collapse' },
                { value: 'CYCLONE', label: 'Cyclone' },
                { value: 'MEDICAL', label: 'Medical Emergency' },
                { value: 'OTHER', label: 'Other Disaster' },
              ]}
              {...register('type')}
            />

            <Select
              label="Severity"
              options={[
                { value: 'LOW', label: 'Low (P-10 Base)' },
                { value: 'MEDIUM', label: 'Medium (P-20 Base)' },
                { value: 'HIGH', label: 'High (P-35 Base)' },
                { value: 'CRITICAL', label: 'Critical (P-50 Base)' },
              ]}
              {...register('severity')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Affected People Count"
              type="number"
              placeholder="e.g. 150"
              error={errors.affectedPeople?.message}
              {...register('affectedPeople')}
            />

            <Input
              label="Street Address / Zone"
              placeholder="e.g. Outer Ring Road, Sector 4"
              error={errors.address?.message}
              {...register('address')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Longitude"
              type="number"
              step="any"
              placeholder="77.5946"
              error={errors.longitude?.message}
              {...register('longitude')}
            />

            <Input
              label="Latitude"
              type="number"
              step="any"
              placeholder="12.9716"
              error={errors.latitude?.message}
              {...register('latitude')}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={createMutation.isPending}>
              Submit Incident
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
