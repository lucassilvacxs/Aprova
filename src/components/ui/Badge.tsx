import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'orange' | 'rose';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'brand',
  size = 'sm',
  dot = false,
  ...props
}) => {
  const base = 'inline-flex items-center gap-1.5 font-semibold rounded-full tracking-wide';

  const variants = {
    brand:   'bg-brand-500/15 text-brand-300 border border-brand-500/25',
    success: 'bg-success-light text-success-text border border-success/20',
    warning: 'bg-warning-light text-warning-text border border-warning/20',
    danger:  'bg-danger-light text-danger-text border border-danger/20',
    info:    'bg-info-light text-info-text border border-info/20',
    neutral: 'bg-bg-elevated text-text-secondary border border-border',
    orange:  'bg-kpi-orange-bg text-kpi-orange-text border border-kpi-orange-border/30',
    rose:    'bg-kpi-rose-bg text-kpi-rose-text border border-kpi-rose-border/30',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const dotColors: Record<string, string> = {
    brand:   'bg-brand-400',
    success: 'bg-success',
    warning: 'bg-warning',
    danger:  'bg-danger',
    info:    'bg-info',
    neutral: 'bg-text-muted',
    orange:  'bg-kpi-orange-border',
    rose:    'bg-kpi-rose-border',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], sizes[size], className))} {...props}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
