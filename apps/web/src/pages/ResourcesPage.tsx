import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { Resource, PaginatedResult } from '../types';
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

const newResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['MEDICAL', 'FOOD', 'WATER', 'VEHICLE', 'SHELTER', 'EQUIPMENT', 'OTHER']),
  totalQuantity: z.coerce.number().positive('Total quantity must be greater than 0'),
  availableQuantity: z.coerce.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
});

type NewResourceFormData = z.infer<typeof newResourceSchema>;

export const ResourcesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewResourceFormData>({
    resolver: zodResolver(newResourceSchema),
    defaultValues: {
      type: 'MEDICAL',
      totalQuantity: 100,
      unit: 'units',
      longitude: 77.5946,
      latitude: 12.9716,
    },
  });

  const { data, isLoading, error } = useQuery<PaginatedResult<Resource>>({
    queryKey: ['resources', page, typeFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/resources?${params.toString()}`);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: NewResourceFormData) => {
      const payload = {
        name: formData.name,
        type: formData.type,
        totalQuantity: formData.totalQuantity,
        availableQuantity: formData.availableQuantity ?? formData.totalQuantity,
        unit: formData.unit,
        location: {
          type: 'Point',
          coordinates: [formData.longitude, formData.latitude],
        },
      };
      const res = await api.post('/resources', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsCreateModalOpen(false);
      reset();
      setFormError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Failed to create resource.';
      setFormError(msg);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Emergency Resource Stockpiles</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time supply inventories with atomic concurrency protection
          </p>
        </div>

        {hasRole('ADMIN', 'COORDINATOR') && (
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Resource Stock
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search resource name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Resource Types</option>
            <option value="MEDICAL">Medical</option>
            <option value="FOOD">Food</option>
            <option value="WATER">Water</option>
            <option value="VEHICLE">Vehicles</option>
            <option value="SHELTER">Shelter</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available / Optimal</option>
            <option value="LOW">Low Stock</option>
            <option value="EXHAUSTED">Exhausted / Depleted</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Resources Table */}
      <Card className="overflow-hidden border-slate-800">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-xs">Failed to load resources.</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No resources match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Resource Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Available / Total</th>
                  <th className="py-3 px-4">Utilization</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location (Lng, Lat)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.items.map((res) => {
                  const percentAvailable =
                    res.totalQuantity > 0
                      ? Math.round((res.availableQuantity / res.totalQuantity) * 100)
                      : 0;

                  return (
                    <tr key={res._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{res.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Unit: {res.unit}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{res.type}</td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-slate-100">{res.availableQuantity}</span>
                        <span className="text-slate-500"> / {res.totalQuantity} {res.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentAvailable < 20
                                  ? 'bg-red-500'
                                  : percentAvailable < 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentAvailable}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {percentAvailable}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="custom"
                          className={`text-[10px] ${getStatusBadgeColor(res.status)}`}
                        >
                          {res.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {res.location.coordinates[0].toFixed(4)}, {res.location.coordinates[1].toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Create Resource Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Emergency Resource Stock"
        description="Register a new stockpile to deploy across active emergency operations"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <Input
            label="Resource Name"
            placeholder="e.g. Purified Drinking Water (20L Cans)"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Resource Type"
              options={[
                { value: 'MEDICAL', label: 'Medical' },
                { value: 'FOOD', label: 'Food' },
                { value: 'WATER', label: 'Water' },
                { value: 'VEHICLE', label: 'Vehicles' },
                { value: 'SHELTER', label: 'Shelter' },
                { value: 'EQUIPMENT', label: 'Equipment' },
                { value: 'OTHER', label: 'Other' },
              ]}
              {...register('type')}
            />

            <Input
              label="Measurement Unit"
              placeholder="e.g. kits, cans, boxes, units"
              error={errors.unit?.message}
              {...register('unit')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Quantity"
              type="number"
              placeholder="e.g. 500"
              error={errors.totalQuantity?.message}
              {...register('totalQuantity')}
            />

            <Input
              label="Initial Available Quantity"
              type="number"
              placeholder="Leave blank to match total"
              {...register('availableQuantity')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Depot Longitude"
              type="number"
              step="any"
              placeholder="77.5946"
              {...register('longitude')}
            />
            <Input
              label="Depot Latitude"
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
              Register Resource
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
