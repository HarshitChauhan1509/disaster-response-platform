import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-slate-900 border border-slate-800/80 rounded-xl shadow-sm transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
