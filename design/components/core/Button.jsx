import React from "react";

const SIZES = {
  sm: { height: 32, padding: "0 12px", fontSize: 13 },
  md: { height: 40, padding: "0 20px", fontSize: 14 },
  lg: { height: 48, padding: "0 28px", fontSize: 16 },
};

function variantStyle(variant, hover) {
  switch (variant) {
    case "primary":
      return { background: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))`, border: "1px solid transparent", opacity: hover ? 0.9 : 1, boxShadow: hover ? "var(--glow-primary)" : "none" };
    case "secondary":
      return { background: hover ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)", color: `hsl(var(--foreground))`, border: "1px solid rgba(255,255,255,0.1)" };
    case "outline":
      return { background: hover ? "rgba(255,255,255,0.05)" : "transparent", color: `hsl(var(--foreground))`, border: "1px solid rgba(255,255,255,0.2)" };
    case "ghost":
      return { background: hover ? "rgba(255,255,255,0.1)" : "transparent", color: `hsl(var(--foreground))`, border: "1px solid transparent" };
    case "destructive":
      return { background: hover ? "#dc2626" : "#ef4444", color: "#fff", border: "1px solid transparent" };
    default:
      return {};
  }
}

/** Eleva Pro pill button. Mirrors web/src/components/ui/Button.tsx (tailwind-variants) and app/src/components/ui/Button.tsx (gradient TouchableOpacity), unified onto design tokens. */
export function Button({ variant = "primary", size = "md", fullWidth = false, disabled = false, isLoading = false, icon, children, onClick, style, ...props }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        borderRadius: "var(--radius-full)", fontFamily: "var(--font-sans)", fontWeight: 700,
        cursor: disabled || isLoading ? "not-allowed" : "pointer", transition: "all var(--duration-fast) var(--ease-standard)",
        opacity: disabled ? 0.5 : 1, width: fullWidth ? "100%" : undefined,
        ...SIZES[size], ...variantStyle(variant, hover), ...style,
      }}
      {...props}
    >
      {isLoading ? "\u2026" : icon}
      {children}
    </button>
  );
}
