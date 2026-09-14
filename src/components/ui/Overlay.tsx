import React from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

// ── Modal ──────────────────────────────────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const MODAL_SIZES = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}) => {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div className={clsx(
        'relative w-full bg-bg-elevated border border-border-muted rounded-2xl shadow-xl',
        'animate-scale-in',
        MODAL_SIZES[size]
      )}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div>
              {title && <h2 id="modal-title" className="text-base font-bold text-text-primary">{title}</h2>}
              {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-overlay transition-all ml-3 shrink-0"
              aria-label="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="p-6">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="p-6 pt-0 flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
};

// ── Tabs ───────────────────────────────────────────────────────────────────────
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => (
  <div className={clsx('flex gap-1 border-b border-border scroll-x-hidden', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={clsx(
          'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-all duration-150',
          activeTab === tab.id
            ? 'text-brand-400 border-brand-500'
            : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-muted'
        )}
        role="tab"
        aria-selected={activeTab === tab.id}
      >
        {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
        {tab.label}
        {tab.badge !== undefined && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold flex items-center justify-center">
            {tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ── Tooltip ────────────────────────────────────────────────────────────────────
export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const positions = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group inline-flex">
      {children}
      <div
        className={clsx(
          'absolute z-50 px-2.5 py-1.5 bg-bg-overlay border border-border-muted rounded-lg',
          'text-xs text-text-primary whitespace-nowrap shadow-lg',
          'opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150',
          positions[position]
        )}
      >
        {content}
      </div>
    </div>
  );
};

// ── SectionHeader ──────────────────────────────────────────────────────────────
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action, icon, className }) => (
  <div className={clsx('flex items-center justify-between gap-4', className)}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && <span className="shrink-0 text-brand-400">{icon}</span>}
      <div className="min-w-0">
        <h2 className="text-base font-bold text-text-primary truncate">{title}</h2>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── EmptyState ─────────────────────────────────────────────────────────────────
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={clsx('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
    {icon && (
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
    {description && <p className="text-xs text-text-muted max-w-xs">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ── LoadingState ───────────────────────────────────────────────────────────────
export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Carregando...',
  className,
}) => (
  <div className={clsx('flex flex-col items-center justify-center py-16 gap-3', className)}>
    <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
    <span className="text-sm text-text-secondary">{message}</span>
  </div>
);

// ── SkeletonCard ───────────────────────────────────────────────────────────────
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('bg-bg-card border border-border rounded-2xl p-5 space-y-3 animate-pulse', className)}>
    <div className="flex justify-between items-center">
      <div className="h-3 w-24 bg-border rounded-full" />
      <div className="w-8 h-8 bg-border rounded-xl" />
    </div>
    <div className="h-8 w-20 bg-border rounded-lg" />
    <div className="h-2 w-full bg-border rounded-full" />
    <div className="h-2 w-32 bg-border rounded-full" />
  </div>
);

// ── ErrorState ─────────────────────────────────────────────────────────────────
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Algo deu errado',
  message = 'Não foi possível carregar os dados. Tente novamente.',
  onRetry,
  className,
}) => (
  <div className={clsx('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
    <div className="w-14 h-14 rounded-2xl bg-danger-light border border-danger/20 flex items-center justify-center text-danger text-xl mb-4">
      !
    </div>
    <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
    <p className="text-xs text-text-muted max-w-xs mb-5">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-bg-elevated border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-border-muted transition-all"
      >
        Tentar novamente
      </button>
    )}
  </div>
);
