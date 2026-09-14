import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'ghost' | 'kpi-orange' | 'kpi-purple' | 'kpi-green' | 'kpi-rose' | 'kpi-blue' | 'kpi-amber';
  noPadding?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  noPadding = false,
  hoverable = false,
  ...props
}) => {
  const base = 'rounded-2xl transition-all duration-200';

  const variants = {
    default:     'bg-bg-card border border-border shadow-sm',
    elevated:    'bg-bg-elevated border border-border-muted shadow-md',
    ghost:       'bg-transparent border border-border/40',
    'kpi-orange':'bg-kpi-orange-bg border border-kpi-orange-border/40',
    'kpi-purple':'bg-kpi-purple-bg border border-kpi-purple-border/40',
    'kpi-green': 'bg-kpi-green-bg border border-kpi-green-border/40',
    'kpi-rose':  'bg-kpi-rose-bg border border-kpi-rose-border/40',
    'kpi-blue':  'bg-kpi-blue-bg border border-kpi-blue-border/40',
    'kpi-amber': 'bg-kpi-amber-bg border border-kpi-amber-border/40',
  };

  return (
    <div
      className={twMerge(clsx(
        base,
        variants[variant],
        !noPadding && 'p-5',
        hoverable && 'cursor-pointer hover:border-border-muted hover:shadow-md hover:-translate-y-0.5',
        className
      ))}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon, className, children, ...props }) => (
  <div className={twMerge(clsx('flex items-start justify-between gap-3 mb-4', className))} {...props}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-400">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        {title && <h3 className="text-sm font-semibold text-text-primary truncate">{title}</h3>}
        {subtitle && <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
    {children}
  </div>
);
