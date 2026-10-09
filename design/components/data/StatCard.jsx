import React from "react";

const TREND = { up: "var(--emerald-500)", down: "var(--red-500)", neutral: "var(--zinc-500)" };

/** Metric tile with trend arrow. Mirrors app/src/components/gamification/StatCard.tsx. */
export function StatCard({ label, value, trend, change, icon }) {
  return (
    <div style={{ borderRadius: "var(--radius-xl)", padding: 20, background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontFamily: "var(--font-sans)" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "var(--tracking-widest)", textTransform: "uppercase", color: "hsl(var(--zinc-500))", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "hsl(var(--foreground))" }}>{value}</div>
        {trend && change && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: `hsl(${TREND[trend]})` }}>{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {change}</span>
          </div>
        )}
      </div>
      {icon && <div style={{ background: "rgba(255,255,255,0.05)", padding: 10, borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.05)", color: "hsl(var(--muted-foreground))" }}>{icon}</div>}
    </div>
  );
}
