import React from "react";

const SIZES = { sm: 32, md: 40, lg: 48 };

/** Initials/photo avatar circle. Mirrors the header avatar in app/src/app/(tabs)/index.tsx and the student-initial circle in web StudentCard.tsx. */
export function Avatar({ name = "?", src, size = "md", online, style }) {
  const px = SIZES[size] || SIZES.md;
  return (
    <span style={{ position: "relative", display: "inline-flex", width: px, height: px, ...style }}>
      <span style={{
        width: px, height: px, borderRadius: "50%", overflow: "hidden",
        background: `hsl(var(--primary) / 0.1)`, color: `hsl(var(--primary))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: px * 0.4,
        border: "2px solid hsl(var(--border))",
      }}>
        {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.charAt(0).toUpperCase()}
      </span>
      {online && (
        <span style={{
          position: "absolute", bottom: -1, right: -1, width: px * 0.3, height: px * 0.3,
          borderRadius: "50%", background: "hsl(var(--success))", border: "2px solid hsl(var(--background))",
        }} />
      )}
    </span>
  );
}
