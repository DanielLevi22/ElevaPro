import React from "react";

const COLORS = { success: "var(--emerald-500)", warning: "var(--amber-500)", primary: "var(--lime)" };

/** Goal progress bar with fraction label. Mirrors app/src/components/gamification/ProgressCard.tsx. */
export function ProgressCard({ title, current, target, unit, color = "primary" }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const c = COLORS[color] || COLORS.primary;
  return (
    <div style={{ borderRadius: "var(--radius-xl)", padding: 18, background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))" }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: `hsl(${c})` }}>{current}/{target} {unit}</span>
      </div>
      <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `hsl(${c})`, borderRadius: "var(--radius-full)", transition: "width var(--duration-standard) var(--ease-standard)" }} />
      </div>
    </div>
  );
}
