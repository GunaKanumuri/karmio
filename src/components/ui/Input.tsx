import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 transition-colors',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:ring-2 focus:ring-karmio-500/20 focus:border-karmio-500',
          error ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700',
          'bg-white dark:bg-slate-900 focus:ring-2 focus:ring-karmio-500/20 focus:border-karmio-500',
          className
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
);
Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>}
      <textarea
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 transition-colors resize-y',
          'placeholder:text-slate-400 focus:ring-2 focus:ring-karmio-500/20 focus:border-karmio-500',
          error ? 'border-red-300' : 'border-slate-200 dark:border-slate-700',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
