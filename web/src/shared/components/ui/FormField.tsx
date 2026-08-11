import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: FormFieldProps) {
  const footer = error ?? hint;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(opcional)</span>
        )}
      </label>
      {children}
      {footer && (
        <p
          className={cn("text-xs", error ? "text-red-400" : "text-muted-foreground")}
          role={error ? "alert" : undefined}
        >
          {footer}
        </p>
      )}
    </div>
  );
}
