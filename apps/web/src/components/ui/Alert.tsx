import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, message, className }) => {
  const configs = {
    info: {
      icon: Info,
      wrapper: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
      iconColor: 'text-sky-400',
    },
    success: {
      icon: CheckCircle2,
      wrapper: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      iconColor: 'text-emerald-400',
    },
    warning: {
      icon: AlertCircle,
      wrapper: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      iconColor: 'text-amber-400',
    },
    error: {
      icon: XCircle,
      wrapper: 'bg-red-500/10 border-red-500/30 text-red-300',
      iconColor: 'text-red-400',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-3 p-3.5 border rounded-lg text-sm', config.wrapper, className)}>
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconColor)} />
      <div>
        {title && <h5 className="font-medium text-slate-100 mb-0.5">{title}</h5>}
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
      </div>
    </div>
  );
};
