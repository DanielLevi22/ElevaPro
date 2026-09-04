"use client";

import { Button } from "@/shared/components/ui/Button";
import { formatDate, formatDateRange } from "@/shared/utils/formatDate";
import type { PeriodizationProposal } from "../types";

const DIA_MS = 86_400_000;

/**
 * `AAAA-MM-DD` somado em semanas, em UTC.
 *
 * `new Date("2026-08-12")` já é interpretado como UTC; somar em milissegundos e
 * cortar de volta em 10 caracteres evita o dia a menos em fuso negativo — a
 * armadilha registrada no `formatDate`.
 */
function addWeeks(isoDate: string, weeks: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`).getTime();
  if (Number.isNaN(base)) return isoDate;
  return new Date(base + weeks * 7 * DIA_MS).toISOString().slice(0, 10);
}

/** Janela de uma fase: começa onde a anterior terminou — a regra do servidor. */
function phaseWindow(data: PeriodizationProposal, index: number): { start: string; end: string } {
  let start = data.startDate;
  for (let i = 0; i < index; i++) {
    start = addWeeks(start, data.phases[i]?.weeks ?? 0);
  }
  return { start, end: addWeeks(start, data.phases[index]?.weeks ?? 0) };
}

interface Props {
  data: PeriodizationProposal;
  /** Preenchido depois de salva: some o botão, entra o selo. */
  savedId?: string;
  loading: boolean;
  onApprove: () => void;
  onAdjust: () => void;
}

export function PeriodizationProposalCard({ data, savedId, loading, onApprove, onAdjust }: Props) {
  return (
    <div className="bg-surface border border-primary/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">Proposta de Periodização</h4>
        {savedId ? (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
            ✓ Salvo
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
            Aguardando aprovação
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Nome</p>
          <p className="text-foreground font-medium">{data.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Objetivo</p>
          <p className="text-foreground font-medium">{data.goal}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Duração</p>
          <p className="text-foreground font-medium">{data.durationWeeks} semanas</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Nível</p>
          <p className="text-foreground font-medium">{data.level}</p>
        </div>
        {/* O período faltava, e é o que coloca a periodização no calendário —
            sem ele a tela de detalhe mostra um traço. */}
        <div className="col-span-2">
          <p className="text-muted-foreground text-xs">Período</p>
          <p className="text-foreground font-medium">
            {formatDateRange(
              data.startDate,
              addWeeks(data.startDate, data.durationWeeks),
              "medium",
            )}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fases</p>
        {data.phases.map((phase, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: chave composta nome-índice em lista só de leitura, que nunca reordena nem sofre insercao no meio; o indice so desempata nomes repetidos
            key={`${phase.name}-${i}`}
            className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
          >
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{phase.name}</p>
              <p className="text-xs text-muted-foreground">{phase.focus}</p>
              <p className="text-xs text-muted-foreground/80">
                {formatDate(phaseWindow(data, i).start, "short")} →{" "}
                {formatDate(phaseWindow(data, i).end, "short")}
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{phase.weeks} sem</span>
          </div>
        ))}
      </div>

      {!savedId && (
        <div className="flex gap-2 pt-1">
          <Button fullWidth size="sm" onClick={onApprove} disabled={loading}>
            Aprovar e Salvar
          </Button>
          <Button fullWidth size="sm" variant="secondary" onClick={onAdjust} disabled={loading}>
            Ajustar
          </Button>
        </div>
      )}
    </div>
  );
}
