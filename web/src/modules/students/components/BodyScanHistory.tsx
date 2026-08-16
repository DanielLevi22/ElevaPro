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

const VISTAS = [
  { chave: "front", rotulo: "Frente" },
  { chave: "back", rotulo: "Costas" },
  { chave: "side", rotulo: "Lateral" },
] as const;

const ESTILOS_DE_RISCO: Record<string, string> = {
  ÓTIMO: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  BOM: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  NORMAL: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  MODERADO: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ALTO: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

/**
 * Cor do rótulo de risco.
 *
 * Cai no neutro quando não reconhece: o `risk` vem do modelo e pode ser uma
 * palavra fora da lista. Um achado sobre a postura de alguém não pode sumir da
 * tela por causa da etiqueta dele.
 */
function estiloDeRisco(risk: string): string {
  return (
    ESTILOS_DE_RISCO[risk.toUpperCase()] ?? "bg-overlay-05 text-muted-foreground border-border"
  );
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
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
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
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
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
              className="rounded-2xl border border-border bg-surface p-5 text-center"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {score.label}
              </p>
              <p className="text-3xl font-black text-foreground mt-2">{score.value ?? "—"}</p>
            </div>
          ))}
        </div>

        {/* Peso e altura vêm da avaliação física, não da imagem; gordura e massa
            magra são estimativas do modelo. A origem fica escrita para o
            especialista não misturar as duas coisas (ADR-010). */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {[
            { label: "Peso", value: latest.weight_kg, unidade: "kg", origem: "medido" },
            { label: "Altura", value: latest.height_cm, unidade: "cm", origem: "medido" },
            { label: "Gordura", value: latest.body_fat_pct, unidade: "%", origem: "estimado" },
            { label: "IMC", value: latest.bmi, unidade: "", origem: "calculado" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {m.label}
              </p>
              <p className="text-xl font-black text-foreground mt-1">
                {m.value ?? "—"}
                <span className="text-xs font-normal text-muted-foreground ml-1">{m.unidade}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{m.origem}</p>
            </div>
          ))}
        </div>

        {latest.recommendations && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {latest.recommendations}
            </p>
          </div>
        )}
      </section>

      {/* O que a análise viu em cada ângulo.
          A imagem não é guardada (ADR-010), então isto é tudo o que resta do
          que foi observado — é o que substitui olhar a foto. */}
      {VISTAS.some(({ chave }) => (latest.posture_feedback?.[chave] ?? []).length > 0) && (
        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
            O que a análise observou
          </h2>
          <p className="text-muted-foreground text-xs mt-1 mb-4">
            Por ângulo, na análise de {formatDate(latest.scanned_at)}. As fotos não são guardadas —
            isto é o registro do que foi visto.
          </p>

          <div className="space-y-5">
            {VISTAS.map(({ chave, rotulo }) => {
              const achados = latest.posture_feedback?.[chave] ?? [];
              if (achados.length === 0) return null;

              return (
                <div key={chave}>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                    {rotulo}
                  </p>
                  <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                    {achados.map((achado, index) => (
                      <div
                        key={`${chave}-${achado.title}`}
                        className={`px-5 py-4 ${index > 0 ? "border-t border-border" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${estiloDeRisco(achado.risk)}`}
                          >
                            {achado.risk}
                          </span>
                          <span className="text-sm font-bold text-foreground">{achado.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                          {achado.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
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
