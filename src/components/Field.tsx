import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface FieldWrapProps {
  label?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, optional, hint, error, className, children }: FieldWrapProps) {
  return (
    <div className={clsx("form-group", className)}>
      {label && (
        <label className="form-label">
          {label} {optional && <span className="optional">(optional)</span>}
        </label>
      )}
      {children}
      {error ? <span className="form-error">{error}</span> : hint ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  ({ className, hasError, ...rest }, ref) => (
    <input ref={ref} className={clsx("input", hasError && "has-error", className)} {...rest} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }>(
  ({ className, hasError, ...rest }, ref) => (
    <textarea ref={ref} className={clsx("textarea", hasError && "has-error", className)} {...rest} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }>(
  ({ className, hasError, children, ...rest }, ref) => (
    <select ref={ref} className={clsx("select", hasError && "has-error", className)} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";
