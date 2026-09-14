import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.97]';

  const variants = {
    primary:   'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/30',
    secondary: 'bg-bg-elevated hover:bg-border-muted/60 text-text-primary border border-border hover:border-border-muted',
    outline:   'bg-transparent hover:bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:border-brand-500/60',
    ghost:     'bg-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary',
    danger:    'bg-danger hover:bg-danger/90 text-white shadow-sm shadow-danger/30',
    success:   'bg-success hover:bg-success/90 text-white shadow-sm shadow-success/30',
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-xs rounded-lg',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
    xl: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      className={twMerge(clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

// ─── IconButton ───────────────────────────────────────────────────────────────
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: 'sm' | 'md' | 'lg';
  label: string;
  isLoading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  className,
  isLoading,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 select-none';

  const variants = {
    primary:   'bg-brand-500 hover:bg-brand-600 text-white',
    secondary: 'bg-bg-elevated hover:bg-border-muted/60 text-text-secondary border border-border',
    outline:   'bg-transparent border border-brand-500/30 text-brand-400 hover:bg-brand-500/10',
    ghost:     'bg-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary',
    danger:    'bg-danger hover:bg-danger/90 text-white',
    success:   'bg-success hover:bg-success/90 text-white',
  };

  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  return (
    <button
      className={twMerge(clsx(base, variants[variant], sizes[size], className))}
      aria-label={label}
      title={label}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    </button>
  );
};
