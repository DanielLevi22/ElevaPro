import React from "react";

/** Label + hint/error wrapper around a form control. Mirrors web/src/components/ui/FormField.tsx. */
export function FormField({ label, htmlFor, error, hint, optional, children }) {
  const footer = error || hint;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-sans)" }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
        {label}
        {optional && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: "hsl(var(--muted-foreground))" }}>(opcional)</span>}
      </label>
      {children}
      {footer && <span style={{ fontSize: 12, color: error ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>{footer}</span>}
    </div>
  );
}
