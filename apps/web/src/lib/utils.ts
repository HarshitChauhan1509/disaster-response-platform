import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'HIGH':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'MEDIUM':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'LOW':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
    case 'AVAILABLE':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'VERIFIED':
    case 'ACCEPTED':
    case 'ASSIGNED':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'REPORTED':
    case 'PENDING':
    case 'LOW':
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    case 'CONTAINED':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'RESOLVED':
    case 'COMPLETED':
    case 'RELEASED':
      return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXHAUSTED':
    case 'INACTIVE':
    case 'BUSY':
    case 'OFF_DUTY':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

export function getPriorityScoreColor(score: number): string {
  if (score >= 80) return 'text-red-400 bg-red-950/40 border-red-800/60';
  if (score >= 60) return 'text-orange-400 bg-orange-950/40 border-orange-800/60';
  if (score >= 40) return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
  return 'text-blue-400 bg-blue-950/40 border-blue-800/60';
}
