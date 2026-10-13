import React from "react";

/** Sidebar nav item with animated active pill. Mirrors the nav items in web/src/app/dashboard/layout.tsx (framer-motion layoutId="active-nav"). */
export function SidebarNavItem({ icon, label, active = false, onClick }) {
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick?.(); }}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
        borderRadius: "var(--radius-lg)", textDecoration: "none", fontFamily: "var(--font-sans)",
        background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
        border: active ? "1px solid hsl(var(--primary) / 0.2)" : "1px solid transparent",
        boxShadow: active ? "0 0 20px rgba(204,255,0,0.05)" : "none",
      }}
    >
      <span style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", display: "flex" }}>{icon}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "var(--tracking-wide)",
        fontStyle: active ? "italic" : "normal", color: active ? "hsl(var(--foreground))" : "hsl(var(--zinc-500))",
      }}>{label}</span>
      {active && <span style={{ position: "absolute", right: 24, width: 4, height: 4, borderRadius: "50%", background: "hsl(var(--primary))", boxShadow: "0 0 8px #ccff00" }} />}
    </a>
  );
}
