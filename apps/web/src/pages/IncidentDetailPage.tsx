import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Users,
  Box,
  MapPin,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  Incident,
  Assignment,
  ResourceAllocation,
  Responder,
  Resource,
  IncidentStatus,
} from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  formatDate,
  getPriorityScoreColor,
  getSeverityBadgeColor,
  getStatusBadgeColor,
} from '../lib/utils';

const assignSchema = z.object({
  responderId: z.string().min(1, 'Please select a responder'),
  notes: z.string().optional(),
});

const allocateSchema = z.object({
  resourceId: z.string().min(1, 'Please select a resource'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  notes: z.string().optional(),
});

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Dialog States
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>('VERIFIED');
  const [statusMessage, setStatusMessage] = useState('');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [releaseAllocationId, setReleaseAllocationId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  // Forms
  const assignForm = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
  });

  const allocateForm = useForm<z.infer<typeof allocateSchema>>({
    resolver: zodResolver(allocateSchema),
  });

  // Queries
  const { data: incident, isLoading: isLoadingInc } = useQuery<Incident>({
    queryKey: ['incident', id],
    queryFn: async () => {
      const res = await api.get(`/incidents/${id}`);
      return res.data.data;
    },
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['incident-assignments', id],
    queryFn: async () => {
      const res = await api.get(`/incidents/${id}/assignments`);
      return res.data.data;
    },
  });

  const { data: allocations = [] } = useQuery<ResourceAllocation[]>({
    queryKey: ['incident-allocations', id],
    queryFn: async () => {
      const res = await api.get(`/incidents/${id}/allocations`);
      return res.data.data;
    },
  });

  // Query Available Responders for assignment modal
  const { data: availableResponders } = useQuery<{ items: Responder[] }>({
    queryKey: ['available-responders'],
    queryFn: async () => {
      const res = await api.get('/responders?status=AVAILABLE&limit=50');
      return res.data.data;
    },
    enabled: isAssignModalOpen,
  });

  // Query Available Resources for allocation modal
  const { data: availableResources } = useQuery<{ items: Resource[] }>({
    queryKey: ['available-resources'],
    queryFn: async () => {
      const res = await api.get('/resources?limit=50');
      return res.data.data;
    },
    enabled: isAllocateModalOpen,
  });

  // Mutations
  const statusMutation = useMutation({
    mutationFn: async ({ status, message }: { status: IncidentStatus; message?: string }) => {
      const res = await api.post(`/incidents/${id}/status`, { status, message });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsStatusModalOpen(false);
      setStatusMessage('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Status transition failed.';
      setActionError(msg);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignSchema>) => {
      const res = await api.post(
        `/incidents/${id}/assignments`,
        data,
        {
          headers: { 'Idempotency-Key': `assign-${id}-${data.responderId}-${Date.now()}` },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incident-assignments', id] });
      queryClient.invalidateQueries({ queryKey: ['responders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsAssignModalOpen(false);
      assignForm.reset();
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Assignment failed.';
      setActionError(msg);
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof allocateSchema>) => {
      const res = await api.post(
        `/resources/${data.resourceId}/allocate`,
        { incidentId: id, quantity: data.quantity, notes: data.notes },
        {
          headers: { 'Idempotency-Key': `alloc-${id}-${data.resourceId}-${Date.now()}` },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incident-allocations', id] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsAllocateModalOpen(false);
      allocateForm.reset();
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Resource allocation failed.';
      setActionError(msg);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      const res = await api.post(`/resources/allocations/${allocationId}/release`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      queryClient.invalidateQueries({ queryKey: ['incident-allocations', id] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setReleaseAllocationId(null);
    },
  });

  const updateAssignmentStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const res = await api.patch(`/assignments/${assignmentId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-assignments', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  if (isLoadingInc) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!incident) {
    return <div className="text-center py-12 text-slate-400">Incident not found.</div>;
  }

  // Calculate allowed transitions based on incident status machine
  const getAllowedTransitions = (status: IncidentStatus): IncidentStatus[] => {
    switch (status) {
      case 'REPORTED':
        return ['VERIFIED', 'REJECTED', 'CANCELLED'];
      case 'VERIFIED':
        return ['ACTIVE', 'CANCELLED'];
      case 'ACTIVE':
        return ['CONTAINED', 'CANCELLED'];
      case 'CONTAINED':
        return ['RESOLVED', 'ACTIVE', 'CANCELLED'];
      default:
        return [];
    }
  };

  const allowedTransitions = getAllowedTransitions(incident.status);
  const isAssignable = ['VERIFIED', 'ACTIVE', 'CONTAINED'].includes(incident.status);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/incidents"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="custom"
                className={`text-[10px] ${getSeverityBadgeColor(incident.severity)}`}
              >
                {incident.severity}
              </Badge>
              <Badge
                variant="custom"
                className={`text-[10px] ${getStatusBadgeColor(incident.status)}`}
              >
                {incident.status}
              </Badge>
              <span className="text-xs font-mono text-slate-400">ID: {incident._id}</span>
            </div>
            <h1 className="text-lg font-bold text-white">{incident.title}</h1>
          </div>
        </div>

        {/* Action Buttons for Coordinators & Admins */}
        {hasRole('ADMIN', 'COORDINATOR') && (
          <div className="flex flex-wrap items-center gap-2">
            {allowedTransitions.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedStatus(allowedTransitions[0]);
                  setIsStatusModalOpen(true);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Change Status
              </Button>
            )}

            {isAssignable && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Assign Responder
                </Button>

                <Button size="sm" onClick={() => setIsAllocateModalOpen(true)}>
                  <Box className="w-3.5 h-3.5 mr-1" />
                  Allocate Resources
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {actionError && <Alert type="error" message={actionError} />}

      {/* Incident Core Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Priority Index</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono px-2 py-0.5 rounded border ${getPriorityScoreColor(
                incident.priorityScore
              )}`}
            >
              P-{incident.priorityScore}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">/ 100 max</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Deterministic multi-factor score</p>
        </Card>

        <Card className="p-4 border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Casualty / At Risk</span>
          <div className="mt-1 text-2xl font-bold text-white">{incident.affectedPeople}</div>
          <p className="text-[10px] text-slate-500 mt-2">Verified population affected</p>
        </Card>

        <Card className="p-4 border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Disaster Type</span>
          <div className="mt-1 text-lg font-bold text-slate-200 font-mono">{incident.type}</div>
          <p className="text-[10px] text-slate-500 mt-2">Incident classification</p>
        </Card>

        <Card className="p-4 border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Coordinates</span>
          <div className="mt-1 text-xs font-mono text-emerald-400 truncate">
            {incident.location.coordinates[0]}, {incident.location.coordinates[1]}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {incident.address}
          </p>
        </Card>
      </div>

      {/* Description & Required Skills */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Situational Assessment
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed">{incident.description}</p>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Required Responder Skills:</span>
          {incident.requiredSkills.length === 0 ? (
            <span className="text-xs text-slate-500">General disaster support</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {incident.requiredSkills.map((sk) => (
                <Badge key={sk} variant="default" className="text-[10px] font-mono">
                  {sk}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Two Column Layout: Responders & Allocations | Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Assigned Responders and Resource Allocations */}
        <div className="space-y-6">
          {/* Assigned Responders Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Assigned Responders ({assignments.length})
                </h3>
              </div>
            </div>

            {assignments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No responders currently assigned to this incident.
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((asg) => {
                  const isAssignedToMe =
                    user?.role === 'RESPONDER' && asg.responderId?.userId?.id === user?.id;

                  return (
                    <div
                      key={asg._id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {asg.responderId?.userId?.name || 'Assigned Responder'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {asg.responderId?.organization}
                          </div>
                        </div>

                        <Badge
                          variant="custom"
                          className={`text-[10px] ${getStatusBadgeColor(asg.status)}`}
                        >
                          {asg.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {asg.responderId?.skills?.map((sk) => (
                          <span
                            key={sk}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>

                      {/* Responder Workflow Action Buttons */}
                      {(isAssignedToMe || hasRole('ADMIN', 'COORDINATOR')) && (
                        <div className="pt-2 border-t border-slate-900 flex items-center justify-end gap-1.5">
                          {asg.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                className="text-xs py-1"
                                onClick={() =>
                                  updateAssignmentStatusMutation.mutate({
                                    assignmentId: asg._id,
                                    status: 'ACCEPTED',
                                  })
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="text-xs py-1"
                                onClick={() =>
                                  updateAssignmentStatusMutation.mutate({
                                    assignmentId: asg._id,
                                    status: 'REJECTED',
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {asg.status === 'ACCEPTED' && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="text-xs py-1"
                              onClick={() =>
                                updateAssignmentStatusMutation.mutate({
                                    assignmentId: asg._id,
                                    status: 'IN_PROGRESS',
                                })
                              }
                            >
                              Start Operations
                            </Button>
                          )}

                          {asg.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="text-xs py-1"
                              onClick={() =>
                                updateAssignmentStatusMutation.mutate({
                                    assignmentId: asg._id,
                                    status: 'COMPLETED',
                                })
                              }
                            >
                              Complete Mission
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Resource Allocations Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Resource Allocations ({allocations.length})
                </h3>
              </div>
            </div>

            {allocations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No emergency supplies or resources allocated yet.
              </p>
            ) : (
              <div className="space-y-3">
                {allocations.map((alloc) => (
                  <div
                    key={alloc._id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        {alloc.quantity} {alloc.resourceId?.unit} of {alloc.resourceId?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Allocated {formatDate(alloc.allocatedAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="custom"
                        className={`text-[10px] ${getStatusBadgeColor(alloc.status)}`}
                      >
                        {alloc.status}
                      </Badge>

                      {hasRole('ADMIN', 'COORDINATOR') && alloc.status === 'ALLOCATED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs py-1"
                          onClick={() => setReleaseAllocationId(alloc._id)}
                        >
                          Release
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Incident Timeline */}
        <Card className="p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">Incident Chronological Timeline</h3>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {incident.timeline.map((evt, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200">{evt.eventType}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatDate(evt.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{evt.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Change Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Incident Lifecycle Status"
        description="Enforces strict backend state machine transitions"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">New Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as IncidentStatus)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {allowedTransitions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reason / Dispatch Log (Optional)
            </label>
            <textarea
              rows={3}
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="Provide context for this status transition..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({ status: selectedStatus, message: statusMessage })
              }
            >
              Confirm Transition
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Responder Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Responder to Incident"
        description="Select an available responder with qualified skills"
      >
        <form onSubmit={assignForm.handleSubmit((d) => assignMutation.mutate(d))} className="space-y-4">
          <Select
            label="Available Responder"
            options={
              availableResponders?.items.map((r) => ({
                value: r._id,
                label: `${r.userId?.name || 'Responder'} (${r.skills.join(', ')}) - ${r.organization}`,
              })) || []
            }
            error={assignForm.formState.errors.responderId?.message}
            {...assignForm.register('responderId')}
          />

          <Input
            label="Assignment Instructions"
            placeholder="e.g. Report to Sector 4 incident staging area"
            {...assignForm.register('notes')}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={assignMutation.isPending}>
              Assign Responder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Allocate Resources Modal */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title="Allocate Emergency Resources"
        description="Atomic concurrency-safe allocation prevents inventory over-subscription"
      >
        <form onSubmit={allocateForm.handleSubmit((d) => allocateMutation.mutate(d))} className="space-y-4">
          <Select
            label="Select Resource"
            options={
              availableResources?.items.map((r) => ({
                value: r._id,
                label: `${r.name} (${r.availableQuantity} ${r.unit} available)`,
              })) || []
            }
            error={allocateForm.formState.errors.resourceId?.message}
            {...allocateForm.register('resourceId')}
          />

          <Input
            label="Quantity to Allocate"
            type="number"
            placeholder="e.g. 10"
            error={allocateForm.formState.errors.quantity?.message}
            {...allocateForm.register('quantity')}
          />

          <Input
            label="Allocation Notes"
            placeholder="e.g. Emergency medical supply for evacuation clinic"
            {...allocateForm.register('notes')}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAllocateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={allocateMutation.isPending}>
              Confirm Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Release Allocation Confirmation */}
      <ConfirmationModal
        isOpen={!!releaseAllocationId}
        onClose={() => setReleaseAllocationId(null)}
        onConfirm={() => {
          if (releaseAllocationId) releaseMutation.mutate(releaseAllocationId);
        }}
        title="Release Allocated Resource?"
        message="This will return the allocated quantity back to available inventory and update the timeline."
        confirmText="Release Resource"
        variant="primary"
        isLoading={releaseMutation.isPending}
      />
    </div>
  );
};
