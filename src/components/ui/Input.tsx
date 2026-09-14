import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Input ──────────────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-text-muted pointer-events-none">{leftIcon}</span>
        )}
        <input
          id={inputId}
          className={twMerge(clsx(
            'w-full bg-bg-elevated border rounded-xl text-sm text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'transition-all duration-150',
            error ? 'border-danger/60 focus:ring-danger/30' : 'border-border hover:border-border-muted',
            leftIcon ? 'pl-10' : 'pl-4',
            rightElement ? 'pr-12' : 'pr-4',
            'py-2.5',
            className
          ))}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 text-text-muted">{rightElement}</span>
        )}
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
};

// ── Textarea ───────────────────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, className, id, ...props }) => {
  const textareaId = id || `textarea-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={twMerge(clsx(
          'w-full bg-bg-elevated border rounded-xl text-sm text-text-primary placeholder:text-text-muted',
          'px-4 py-3 resize-y min-h-[100px]',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60',
          'disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150',
          error ? 'border-danger/60' : 'border-border hover:border-border-muted',
          className
        ))}
        {...props}
      />
      {error && <p className="text-xs text-danger-text">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
};

// ── SearchInput ────────────────────────────────────────────────────────────────
export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ className, onClear, value, ...props }) => {
  return (
    <div className="relative flex items-center">
      <svg className="absolute left-4 w-4 h-4 text-text-muted shrink-0 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        className={twMerge(clsx(
          'w-full pl-11 pr-10 py-2.5 bg-bg-elevated border border-border rounded-full text-sm',
          'text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50',
          'hover:border-border-muted transition-all duration-150',
          className
        ))}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 w-5 h-5 rounded-full bg-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Limpar busca"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
