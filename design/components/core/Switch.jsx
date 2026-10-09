import React from "react";

/** Pill toggle. Mirrors the Mensal/Anual switch in web/src/shared/components/sections/Pricing.tsx. */
export function Switch({ checked = false, onChange, style }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      style={{
        width: 56, height: 28, borderRadius: "var(--radius-full)", position: "relative", border: "none",
        cursor: "pointer", background: checked ? "hsl(var(--primary) / 0.3)" : "rgba(255,255,255,0.1)",
        transition: "background var(--duration-fast) var(--ease-standard)", ...style,
      }}
    >
      <span style={{
        position: "absolute", top: 4, left: checked ? 32 : 4, width: 20, height: 20, borderRadius: "50%",
        background: checked ? "hsl(var(--primary))" : "hsl(var(--zinc-500))",
        transition: "left var(--duration-fast) var(--ease-standard)",
      }} />
    </button>
  );
}
