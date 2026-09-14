import React from 'react';
import { clsx } from 'clsx';

// ── ProgressBar ────────────────────────────────────────────────────────────────
export interface ProgressBarProps {
  value: number; // 0–100
  max?: number;
  colorKey?: 'brand' | 'success' | 'warning' | 'danger' | 'orange' | 'green' | 'blue' | 'rose' | 'purple';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const BAR_COLORS = {
  brand:   'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  orange:  'bg-kpi-orange-border',
  green:   'bg-kpi-green-border',
  blue:    'bg-kpi-blue-border',
  rose:    'bg-kpi-rose-border',
  purple:  'bg-kpi-purple-border',
};

const BAR_SIZES = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  colorKey = 'brand',
  size = 'sm',
  showLabel = false,
  label,
  animated = true,
  className,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-text-secondary">{label}</span>}
          {showLabel && <span className="text-xs font-semibold text-text-primary tabular-nums">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={clsx('w-full rounded-full bg-border overflow-hidden', BAR_SIZES[size])}>
        <div
          className={clsx(
            'h-full rounded-full',
            BAR_COLORS[colorKey],
            animated && 'transition-all duration-700 ease-out'
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

// ── ProgressRing ───────────────────────────────────────────────────────────────
export interface ProgressRingProps {
  value: number; // 0–100
  size?: number; // px
  strokeWidth?: number;
  colorKey?: ProgressBarProps['colorKey'];
  showLabel?: boolean;
  className?: string;
}

const RING_COLORS: Record<string, string> = {
  brand:   '#7C5CFA',
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
  orange:  '#EA580C',
  green:   '#16A34A',
  blue:    '#2563EB',
  rose:    '#E11D48',
  purple:  '#9333EA',
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 56,
  strokeWidth = 4,
  colorKey = 'brand',
  showLabel = true,
  className,
}) => {
  const pct = Math.min(100, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const color = RING_COLORS[colorKey] ?? RING_COLORS.brand;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-bold tabular-nums" style={{ color }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
export interface AvatarProps {
  initials?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const AVATAR_SIZES = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-lg',
};

export const Avatar: React.FC<AvatarProps> = ({ initials = '??', src, size = 'md', className, alt }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || initials}
        className={clsx('rounded-full object-cover shrink-0', AVATAR_SIZES[size], className)}
      />
    );
  }
  return (
    <div
      className={clsx(
        'rounded-full shrink-0 flex items-center justify-center font-bold select-none',
        'bg-gradient-to-br from-brand-500 to-brand-700 text-white',
        AVATAR_SIZES[size],
        className
      )}
      aria-label={alt || initials}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
};

// ── StatCard ───────────────────────────────────────────────────────────────────
export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
  colorKey?: 'orange' | 'purple' | 'green' | 'rose' | 'blue' | 'amber';
  className?: string;
}

const STAT_ICON_COLORS: Record<string, string> = {
  orange: 'text-kpi-orange-text bg-kpi-orange-bg',
  purple: 'text-kpi-purple-text bg-kpi-purple-bg',
  green:  'text-kpi-green-text bg-kpi-green-bg',
  rose:   'text-kpi-rose-text bg-kpi-rose-bg',
  blue:   'text-kpi-blue-text bg-kpi-blue-bg',
  amber:  'text-kpi-amber-text bg-kpi-amber-bg',
};

const STAT_BORDER_COLORS: Record<string, string> = {
  orange: 'border-kpi-orange-border/40',
  purple: 'border-kpi-purple-border/40',
  green:  'border-kpi-green-border/40',
  rose:   'border-kpi-rose-border/40',
  blue:   'border-kpi-blue-border/40',
  amber:  'border-kpi-amber-border/40',
};

const STAT_VALUE_COLORS: Record<string, string> = {
  orange: 'text-kpi-orange-text',
  purple: 'text-kpi-purple-text',
  green:  'text-kpi-green-text',
  rose:   'text-kpi-rose-text',
  blue:   'text-kpi-blue-text',
  amber:  'text-kpi-amber-text',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  deltaPositive = true,
  icon,
  colorKey = 'purple',
  className,
}) => {
  return (
    <div className={clsx(
      'bg-bg-card border rounded-2xl p-5 flex flex-col gap-3 hover:border-opacity-60 transition-all duration-200',
      STAT_BORDER_COLORS[colorKey],
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        {icon && (
          <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', STAT_ICON_COLORS[colorKey])}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <span className={clsx('text-3xl font-extrabold tabular-nums leading-none tracking-tight', STAT_VALUE_COLORS[colorKey])}>
          {value}
        </span>
      </div>
      {delta && (
        <span className={clsx('text-[11px] font-medium', deltaPositive ? 'text-success-text' : 'text-text-muted')}>
          {deltaPositive ? '▲ ' : ''}{delta}
        </span>
      )}
    </div>
  );
};
