import React from "react";

/** Centered modal. Mirrors web/src/components/ui/Dialog.tsx — blurred scrim, surface panel, close X. */
export function Dialog({ open, onClose, title, description, children, maxWidth = 420 }) {
  if (!open) return null;
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
    >
      <div style={{ width: "100%", maxWidth, background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 0" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "hsl(var(--foreground))" }}>{title}</h2>
            {description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>{description}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}
