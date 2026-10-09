import React from "react";

/** Surface card — the base container used everywhere: dashboard stat tiles, student cards, bento feature tiles. Mirrors web StudentCard.tsx / dashboard bento tiles and app/src/components/ui/Card.tsx. */
export function Card({ hoverable = true, radius = "var(--radius-2xl)", children, style, ...props }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        background: "hsl(var(--surface))", border: `1px solid ${hover ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}`,
        borderRadius: radius, padding: "var(--space-6)", transition: "border-color var(--duration-standard) var(--ease-standard)",
        boxShadow: hover ? "var(--shadow-card)" : "none", ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
