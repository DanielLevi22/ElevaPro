import React from "react";

const TONES = {
  success: { color: "var(--emerald-500)" },
  warning: { color: "var(--amber-500)" },
  danger: { color: "var(--red-500)" },
  neutral: { color: "var(--zinc-500)" },
  primary: { color: "var(--lime)" },
  secondary: { color: "var(--cyber-blue)" },
};

/** Status pill. Mirrors app/src/components/ui/StatusBadge.tsx and the account-status chips on web StudentCard.tsx — uppercase micro label, optional dot, tinted background at 10% + border at 20%. */
export function Badge({ tone = "neutral", dot = true, children, style }) {
  const c = TONES[tone]?.color || TONES.neutral.color;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: "var(--radius-full)", background: `hsl(${c} / 0.1)`, border: `1px solid hsl(${c} / 0.2)`,
      color: `hsl(${c})`, fontFamily: "var(--font-sans)", fontWeight: 700,
      fontSize: "var(--text-micro)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)",
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: `hsl(${c})` }} />}
      {children}
    </span>
  );
}
