import type { BodyScanDelta, BodyScanRecord, ComparableField } from "@elevapro/shared";

const LABELS: Record<ComparableField, string> = {
  weight_kg: "Peso",
  body_fat_pct: "Gordura",
  muscle_mass_kg: "Massa magra",
  bmi: "IMC",
  circ_chest: "Peito",
  circ_waist: "Cintura",
  circ_hips: "Quadril",
  circ_arms: "Braço",
  circ_thighs: "Coxa",
  circ_calves: "Panturrilha",
  circ_neck: "Pescoço",
  circ_shoulders: "Ombro",
};

const UNITS: Partial<Record<ComparableField, string>> = {
  weight_kg: "kg",
  body_fat_pct: "%",
  muscle_mass_kg: "kg",
  bmi: "",
};

function unitFor(field: ComparableField): string {
  return UNITS[field] ?? "cm";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface BodyScanHistoryProps {
  scans: BodyScanRecord[];
  deltas: BodyScanDelta[];
}

/**
 * Histórico e comparação das análises corporais de um aluno.
 *
 * A comparação vem primeiro e as medidas absolutas depois, de propósito: o
 * erro sistemático da estimativa se repete entre dois escaneamentos e se
 * cancela na diferença, então o delta é o número mais confiável da tela
 * (`ADR-010`). Invertida, a ordem faz o especialista anotar o valor absoluto.
 */
export function BodyScanHistory({ scans, deltas }: BodyScanHistoryProps) {
  if (scans.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-8 text-center">
        <p className="text-foreground font-bold">Nenhuma análise corporal ainda</p>
        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
          O aluno faz a análise pelo aplicativo, com três fotos. O resultado aparece aqui
          automaticamente.
        </p>
      </div>
    );
  }

  const latest = scans[0];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
          O que mudou
        </h2>
        <p className="text-muted-foreground text-xs mt-1 mb-4">
          {deltas.length > 0
            ? "Entre as duas análises mais recentes. A diferença é mais confiável que o valor absoluto."
            : "Só há uma análise até agora — não há com o que comparar."}
        </p>

        {deltas.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
            {deltas.map((delta, index) => (
              <div
                key={delta.field}
                className={`flex items-center justify-between px-5 py-3 ${
                  index > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <span className="text-sm text-foreground">{LABELS[delta.field]}</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-xs text-muted-foreground">
                    {delta.previous}
                    {unitFor(delta.field)} → {delta.current}
                    {unitFor(delta.field)}
                  </span>
                  <span className="text-sm font-black text-primary w-20 text-right">
                    {delta.change > 0 ? "+" : ""}
                    {delta.change}
                    {unitFor(delta.field)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
          Postura e simetria
        </h2>
        <p className="text-muted-foreground text-xs mt-1 mb-4">
          Análise de {formatDate(latest.scanned_at)}. Indicativo — o diagnóstico é seu.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Simetria", value: latest.posture_symmetry_score },
            { label: "Muscular", value: latest.posture_muscle_score },
            { label: "Postura", value: latest.posture_overall_score },
          ].map((score) => (
            <div
              key={score.label}
              className="rounded-2xl border border-white/10 bg-surface p-5 text-center"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {score.label}
              </p>
              <p className="text-3xl font-black text-foreground mt-2">{score.value ?? "—"}</p>
            </div>
          ))}
        </div>

        {latest.recommendations && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-surface p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {latest.recommendations}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
          Medidas estimadas
        </h2>
        {/* O aviso fica acima da tabela e não abaixo: lido depois dos números,
            não muda mais o que o especialista já anotou. */}
        <p className="text-muted-foreground text-xs mt-1 mb-4">
          Estimadas a partir da altura como escala, com erro típico de 5 a 10%. Não substituem a
          fita métrica.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  Data
                </th>
                {(
                  ["circ_chest", "circ_waist", "circ_hips", "circ_arms", "circ_thighs"] as const
                ).map((field) => (
                  <th
                    key={field}
                    className="text-right px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground font-bold"
                  >
                    {LABELS[field]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-foreground">{formatDate(scan.scanned_at)}</td>
                  {(
                    ["circ_chest", "circ_waist", "circ_hips", "circ_arms", "circ_thighs"] as const
                  ).map((field) => (
                    <td key={field} className="px-5 py-3 text-right text-muted-foreground">
                      {scan[field] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
