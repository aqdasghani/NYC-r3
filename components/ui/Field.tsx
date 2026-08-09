"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-faint transition-colors " +
  "focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    return <input ref={ref} className={cn(controlClass, "h-9", className)} {...rest} />;
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <select ref={ref} className={cn(controlClass, "h-9 appearance-none pr-8", className)} {...rest}>
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...rest }, ref) => {
    return <textarea ref={ref} className={cn(controlClass, "py-2 leading-relaxed", className)} {...rest} />;
  }
);
Textarea.displayName = "Textarea";

/** Label + control + optional hint/error wrapper. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-dim">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
