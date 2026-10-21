import { describeRemaining, type MacroKey, type MacroTotals } from "../utils/macroTotals";
import { RemainingChip } from "./RemainingChip";

/** Meta e o que já está no dia — o que os modais precisam para mostrar o saldo. */
export interface DaySnapshot {
  targets: MacroTotals;
  /** O que já está nas refeições do dia. */
  consumed: MacroTotals;
  dayLabel?: string;
}

interface DayBalanceProps extends DaySnapshot {
  /** O alimento sendo adicionado, para mostrar como o dia fica depois dele. */
  preview?: MacroTotals;
}

interface MacroRow {
  key: MacroKey;
  label: string;
  unit: string;
  labelClass: string;
  barClass: string;
  pastClass: string;
}

// Classes literais: o Tailwind não enxerga classe montada em runtime.
const MACRO_ROWS: MacroRow[] = [
  {
    key: "calories",
    label: "Kcal",
    unit: " kcal",
    labelClass: "text-zinc-200",
    barClass: "bg-zinc-200",
    pastClass: "bg-zinc-200/35",
  },
  {
    key: "protein",
    label: "Prot",
    unit: "g",
    labelClass: "text-emerald-400",
    barClass: "bg-emerald-500",
    pastClass: "bg-emerald-500/35",
  },
  {
    key: "carbs",
    label: "Carb",
    unit: "g",
    labelClass: "text-blue-400",
    barClass: "bg-blue-500",
    pastClass: "bg-blue-500/35",
  },
  {
    key: "fat",
    label: "Gord",
    unit: "g",
    labelClass: "text-yellow-400",
    barClass: "bg-yellow-500",
    pastClass: "bg-yellow-500/35",
  },
];

function toPercentage(amount: number, target: number): number {
  return target > 0 ? Math.min((amount / target) * 100, 100) : 0;
}

interface BalanceBarProps {
  row: MacroRow;
  consumed: number;
  added: number;
  target: number;
  isOver: boolean;
}

function BalanceBar({ row, consumed, added, target, isOver }: BalanceBarProps) {
  const pastWidth = toPercentage(consumed, target);
  const addedWidth = toPercentage(consumed + added, target) - pastWidth;
  return (
    <div className="flex h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className={row.pastClass} style={{ width: `${pastWidth}%` }} />
      <div
        className={`transition-[width] duration-300 ${isOver ? "bg-amber-400" : row.barClass}`}
        style={{ width: `${addedWidth}%` }}
      />
    </div>
  );
}

/**
 * Saldo do dia contra a meta do plano, macro a macro. Com `preview`, mostra o dia
 * como fica depois do alimento — para ajustar a quantidade sem perder de vista o que falta.
 *
 * @example <DayBalance targets={dailyTargets(plan)} consumed={dayTotals} preview={foodMacros} />
 */
export function DayBalance({ targets, consumed, preview, dayLabel }: DayBalanceProps) {
  return (
    <section
      aria-label="Saldo do dia"
      className="bg-background/50 border border-white/10 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {dayLabel ? `Saldo do dia · ${dayLabel}` : "Saldo do dia"}
        </p>
        {preview && (
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-zinc-200/35" /> já no dia
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-zinc-200" /> este alimento
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-x-3 gap-y-2.5">
        {MACRO_ROWS.map((row) => {
          const added = preview?.[row.key] ?? 0;
          const after = consumed[row.key] + added;
          const target = targets[row.key];
          const remaining = describeRemaining(after, target, row.unit);
          return (
            <div key={row.key} className="contents">
              <span className={`text-xs font-bold ${row.labelClass}`}>{row.label}</span>
              <BalanceBar
                row={row}
                consumed={consumed[row.key]}
                added={added}
                target={target}
                isOver={remaining.tone === "over"}
              />
              <span className="text-[11px] text-zinc-500 tabular-nums text-right">
                {Math.round(after)}/{Math.round(target)}
              </span>
              <RemainingChip text={remaining.text} tone={remaining.tone} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
