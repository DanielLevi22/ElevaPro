import React from "react";

/** Text input. Mirrors web/src/components/ui/Input.tsx and app/src/components/ui/Input.tsx — translucent surface, lime focus ring. */
export function Input({ label, error, leftIcon, style, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-sans)" }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {leftIcon && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))" }}>{leftIcon}</span>}
        <input
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={{
            width: "100%", height: 44, borderRadius: "var(--radius-lg)", padding: leftIcon ? "0 14px 0 38px" : "0 14px",
            background: "rgba(255,255,255,0.05)", color: "hsl(var(--foreground))", fontSize: 14,
            border: `1px solid ${error ? "hsl(var(--destructive) / 0.7)" : focused ? "hsl(var(--primary))" : "rgba(255,255,255,0.1)"}`,
            outline: "none", boxSizing: "border-box", ...style,
          }}
          {...props}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: "hsl(var(--destructive))" }}>{error}</span>}
    </div>
  );
}
