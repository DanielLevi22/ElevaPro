import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: "primary" | "secondary" | "accent";
  loading?: boolean;
}

// primary usa --primary-text, nao --primary: o lime puro nao tem contraste
// suficiente como texto/icone sobre superficie clara.
const TONE = {
  primary: { text: "text-primary-text", bg: "bg-primary/12" },
  secondary: { text: "text-secondary", bg: "bg-secondary/12" },
  accent: { text: "text-accent", bg: "bg-accent/12" },
};

export function StatCard({ title, value, icon, color, loading }: StatCardProps) {
  const tone = TONE[color];

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[22px] p-5" aria-hidden="true">
        <div className="h-3 w-1/2 rounded bg-overlay-10 animate-pulse" />
        <div className="mt-3.5 h-8 w-2/5 rounded bg-overlay-10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-[22px] p-5 transition-colors hover:border-overlay-15">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground">{title}</p>
          <p className="mt-1.5 font-display text-3xl font-extrabold text-foreground">{value}</p>
        </div>
        <div
          className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${tone.bg} ${tone.text}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
