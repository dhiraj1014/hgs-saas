"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Editorial form aesthetic mirroring hgs-web's admissions form.
 * Underline-only inputs, tiny eyebrow labels, saffron focus.
 */

export const FIELD_LABEL_CLASS =
  "text-[11.5px] font-medium uppercase tracking-[0.14em] text-mute";

export const FIELD_CONTROL_CLASS =
  "w-full bg-transparent border-0 border-b-[1.5px] border-rule px-0 py-2.5 text-[15px] text-ink rounded-none transition-colors placeholder:text-mute/50 focus:outline-none focus:border-saffron disabled:opacity-50 disabled:cursor-not-allowed";

export function FieldGrid({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-x-7 gap-y-6 sm:grid-cols-2", className)}
      {...rest}
    />
  );
}

export function Field({
  className,
  full,
  children,
}: {
  className?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", full && "sm:col-span-2", className)}>
      {children}
    </div>
  );
}

export function FieldLabel({
  children,
  htmlFor,
  required,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(FIELD_LABEL_CLASS, className)}>
      {children}
      {required && <span className="ml-1 text-[#B26116]">*</span>}
    </label>
  );
}

export const FieldInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function FieldInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD_CONTROL_CLASS, className)} {...props} />;
});

export const FieldSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
>(function FieldSelect({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(FIELD_CONTROL_CLASS, "appearance-none bg-no-repeat pr-7", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236F6B65' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundPosition: "right 0.25rem center",
        backgroundSize: "0.85rem",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export const FieldTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function FieldTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(FIELD_CONTROL_CLASS, "min-h-[110px] resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

/**
 * Rich combobox that matches the underline aesthetic but renders a custom
 * popover (instead of the browser's native select dropdown). Drop-in for
 * places that previously used <FieldSelect>.
 *
 * Supports both controlled (value + onChange) and uncontrolled (defaultValue
 * with a hidden input named `name` for form submission) usage.
 */
type ComboboxOption = { value: string; label: string };

export function FieldCombobox({
  name,
  id,
  value,
  defaultValue,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  required,
}: {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  function handleChange(v: string) {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  }

  return (
    <>
      {name && (
        <input
          type="hidden"
          name={name}
          value={current ?? ""}
          required={required}
        />
      )}
      <Select
        value={current || undefined}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "h-auto w-full rounded-none border-0 border-b-[1.5px] border-rule bg-transparent px-0 py-2.5 text-[15px] text-ink shadow-none transition-colors focus-visible:border-saffron focus-visible:ring-0 data-placeholder:text-mute/60 [&>span]:flex-1 [&>span]:text-left",
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          className="overflow-hidden rounded-xl border border-rule bg-white p-1 shadow-lg ring-1 ring-ink/5"
        >
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-ink transition-colors data-[highlighted]:bg-saffron/10 data-[highlighted]:text-[#B26116] data-[state=checked]:font-medium"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-rose-600">{children}</span>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-mute">{children}</span>;
}

export function FieldCheckbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("inline-flex items-start gap-2.5 text-sm text-ink", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 cursor-pointer accent-saffron"
        {...props}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function FieldRadio({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("inline-flex items-start gap-2.5 text-sm text-ink cursor-pointer", className)}>
      <input
        type="radio"
        className="mt-0.5 size-4 cursor-pointer accent-saffron"
        {...props}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function FormStatus({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <p className={cn("rounded-lg border px-4 py-3 text-sm", cls)}>{children}</p>
  );
}

/**
 * Card-styled wrapper for a form. Provides consistent padding and a
 * separator above the action row.
 */
export function FormCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-rule bg-white p-6 sm:p-8", className)}>
      {children}
    </div>
  );
}

export function FormActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-wrap items-center justify-end gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
