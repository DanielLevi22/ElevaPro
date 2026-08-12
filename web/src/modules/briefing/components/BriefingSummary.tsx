import type { BriefingSignal } from "@elevapro/shared";

interface BriefingSummaryProps {
  signals: BriefingSignal[];
  activeStudents: number;
  /** Data já formatada — o servidor decide, para o texto não trocar na hidratação. */
  today: string;
}

function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * O parágrafo de abertura do dia.
 *
 * Template com número real, não texto de IA: mandar nome e situação de saúde de
 * aluno para um modelo é outro tratamento, com outra base legal, e o valor da
 * tela não depende disso.
 */
export function BriefingSummary({ signals, activeStudents, today }: BriefingSummaryProps) {
  const inactive = signals.filter((s) => s.kind === "inactive").length;
  const invites = signals.filter((s) => s.kind === "pending_invite").length;
  const ready = signals.filter((s) => s.kind === "anamnesis_ready").length;

  return (
    <section>
      <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-warning">
        Briefing de {today}
      </p>

      {/* O parágrafo tem medida própria mesmo na tela cheia: linha longa demais
          é o que faz o olho perder a próxima. O resto da página usa a largura. */}
      <p className="mt-3.5 max-w-4xl font-display text-[2rem] font-medium leading-[1.25] tracking-[-0.01em] text-foreground">
        {activeStudents === 0 ? (
          <>
            Você ainda não tem alunos ativos. Assim que vincular o primeiro, o briefing começa aqui.
          </>
        ) : (
          <>
            Você tem <b>{plural(activeStudents, "aluno ativo", "alunos ativos")}</b>.{" "}
            {inactive > 0 && (
              <>
                <b className="text-destructive">
                  {plural(inactive, "em risco de abandono", "em risco de abandono")}
                </b>{" "}
                {inactive === 1 ? "precisa" : "precisam"} de atenção hoje.{" "}
              </>
            )}
            {invites > 0 && (
              <>{plural(invites, "convite segue", "convites seguem")} sem resposta. </>
            )}
            {ready > 0 && (
              <>
                {plural(ready, "aluno está pronto", "alunos estão prontos")} para receber o plano.{" "}
              </>
            )}
            {inactive === 0 && invites === 0 && ready === 0 && (
              <>Nada exige ação agora — todo mundo está em dia.</>
            )}
          </>
        )}
      </p>
    </section>
  );
}
