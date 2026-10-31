"use client";

interface Day {
  id: number;
  label: string;
  short: string;
}

interface DaySelectorProps {
  days: Day[];
  selectedDay: number;
  onSelectDay: (id: number) => void;
  isCyclic: boolean;
}

export function DaySelector({ days, selectedDay, onSelectDay, isCyclic }: DaySelectorProps) {
  if (!isCyclic) {
    return (
      <div className="glass rounded-lg p-4 text-center text-muted-foreground">
        Este é um plano de dieta única (todos os dias seguem o mesmo cardápio).
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto pb-2 gap-2 custom-scrollbar">
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => onSelectDay(day.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedDay === day.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-surface border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <span className="md:hidden">{day.short}</span>
          <span className="hidden md:inline">{day.label}</span>
        </button>
      ))}
    </div>
  );
}
