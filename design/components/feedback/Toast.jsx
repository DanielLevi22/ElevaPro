import React from "react";

const TONES = { success: "var(--emerald-500)", error: "var(--red-500)", info: "var(--cyber-blue)" };

/** Toast notification. Mirrors the `sonner` Toaster used in web/src/app/layout.tsx (richColors, bottom-right). */
export function Toast({ tone = "info", title, description }) {
  const c = TONES[tone] || TONES.info;
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start", width: 320, padding: 16,
      background: "hsl(var(--surface))", border: `1px solid hsl(${c} / 0.3)`, borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)", fontFamily: "var(--font-sans)",
    }}>
      <span style={{ width: 8, height: 8, marginTop: 5, borderRadius: "50%", background: `hsl(${c})`, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))" }}>{title}</div>
        {description && <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{description}</div>}
      </div>
    </div>
  );
}
