import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Navigation,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { Responder, PaginatedResult } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getStatusBadgeColor } from '../lib/utils';

const newResponderSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  organization: z.string().min(2, 'Organization is required'),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFF_DUTY']),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
});

type NewResponderFormData = z.infer<typeof newResponderSchema>;

export const RespondersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [orgFilter, setOrgFilter] = useState<string>('');

  // Geospatial proximity query state
  const [useProximity, setUseProximity] = useState<boolean>(false);
  const [proximityLng, setProximityLng] = useState<number>(77.5946);
  const [proximityLat, setProximityLat] = useState<number>(12.9716);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewResponderFormData>({
    resolver: zodResolver(newResponderSchema),
    defaultValues: {
      organization: 'NDRF Quick Response Team',
      status: 'AVAILABLE',
      skills: ['MEDICAL', 'SEARCH_AND_RESCUE'],
      longitude: 77.5946,
      latitude: 12.9716,
    },
  });

  // Query responders list
  const { data, isLoading, error } = useQuery<PaginatedResult<Responder>>({
    queryKey: [
      'responders',
      page,
      statusFilter,
      skillFilter,
      orgFilter,
      useProximity,
      proximityLng,
      proximityLat,
      maxDistanceKm,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (statusFilter) params.append('status', statusFilter);
      if (skillFilter) params.append('skill', skillFilter);
      if (orgFilter) params.append('organization', orgFilter);

      if (useProximity) {
        params.append('longitude', proximityLng.toString());
        params.append('latitude', proximityLat.toString());
        params.append('maxDistanceKm', maxDistanceKm.toString());
      }

      const res = await api.get(`/responders?${params.toString()}`);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: NewResponderFormData) => {
      const payload = {
        userId: formData.userId,
        organization: formData.organization,
        status: formData.status,
        skills: formData.skills,
        location: {
          type: 'Point',
          coordinates: [formData.longitude, formData.latitude],
        },
      };
      const res = await api.post('/responders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsCreateModalOpen(false);
      reset();
      setFormError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to create responder profile.';
      setFormError(msg);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ responderId, status }: { responderId: string; status: string }) => {
      const res = await api.patch(`/responders/${responderId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Responder Fleet & Personnel</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Emergency teams, skill profiles and real-time operational availability
          </p>
        </div>

        {hasRole('ADMIN', 'COORDINATOR') && (
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Register Responder
          </Button>
        )}
      </div>

      {/* Filter and Geospatial Search Controls */}
      <Card className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="BUSY">Busy</option>
            <option value="OFF_DUTY">Off Duty</option>
          </select>

          {/* Skill Filter */}
          <select
            value={skillFilter}
            onChange={(e) => {
              setSkillFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Skills</option>
            <option value="MEDICAL">Medical</option>
            <option value="FIRE">Fire</option>
            <option value="SEARCH_AND_RESCUE">Search & Rescue</option>
            <option value="ENGINEERING">Engineering</option>
            <option value="DRIVER">Driver</option>
            <option value="WATER_RESCUE">Water Rescue</option>
          </select>

          {/* Org Filter */}
          <input
            type="text"
            placeholder="Filter by organization..."
            value={orgFilter}
            onChange={(e) => {
              setOrgFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          {/* Proximity Toggle */}
          <button
            type="button"
            onClick={() => setUseProximity(!useProximity)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
              useProximity
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            {useProximity ? 'Geospatial Filter: ON' : 'Geospatial Proximity Search'}
          </button>
        </div>

        {/* Proximity Details (If active) */}
        {useProximity && (
          <div className="p-3 bg-slate-950/70 border border-emerald-500/30 rounded-lg flex flex-wrap items-center gap-3 text-xs">
            <span className="text-emerald-400 font-mono flex items-center gap-1 text-[11px]">
              <MapPin className="w-3.5 h-3.5" /> 2dsphere index query:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Lng:</span>
              <input
                type="number"
                step="any"
                value={proximityLng}
                onChange={(e) => setProximityLng(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Lat:</span>
              <input
                type="number"
                step="any"
                value={proximityLat}
                onChange={(e) => setProximityLat(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Radius:</span>
              <input
                type="number"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(parseInt(e.target.value) || 10)}
                className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-xs"
              />
              <span className="text-slate-500">km</span>
            </div>
          </div>
        )}
      </Card>

      {/* Responders Table */}
      <Card className="overflow-hidden border-slate-800">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-xs">Failed to load responders.</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No responders found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Name / ID</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">GPS Location</th>
                  <th className="py-3 px-4 text-right">Quick Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.items.map((resp) => (
                  <tr key={resp._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">
                        {resp.userId?.name || 'Responder'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{resp.userId?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">{resp.organization}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {resp.skills.map((sk) => (
                          <span
                            key={sk}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-300"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="custom"
                        className={`text-[10px] ${getStatusBadgeColor(resp.status)}`}
                      >
                        {resp.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {resp.location.coordinates[0].toFixed(4)}, {resp.location.coordinates[1].toFixed(4)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {hasRole('ADMIN', 'COORDINATOR') && (
                        <select
                          value={resp.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              responderId: resp._id,
                              status: e.target.value,
                            })
                          }
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="BUSY">BUSY</option>
                          <option value="OFF_DUTY">OFF_DUTY</option>
                        </select>
                      )}
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

      {/* Register Responder Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Responder"
        description="Deploy a qualified field responder to emergency operations"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <Input
            label="User ID"
            placeholder="MongoDB ObjectId of user account"
            error={errors.userId?.message}
            {...register('userId')}
          />

          <Input
            label="Organization"
            placeholder="e.g. State Disaster Mitigation Force"
            error={errors.organization?.message}
            {...register('organization')}
          />

          <Select
            label="Initial Status"
            options={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'OFF_DUTY', label: 'Off Duty' },
              { value: 'BUSY', label: 'Busy' },
            ]}
            {...register('status')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Longitude"
              type="number"
              step="any"
              placeholder="77.5946"
              {...register('longitude')}
            />
            <Input
              label="Latitude"
              type="number"
              step="any"
              placeholder="12.9716"
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
              Register Responder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
