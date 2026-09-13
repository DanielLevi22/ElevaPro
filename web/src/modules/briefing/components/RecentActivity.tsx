import type { ActivityKind, RecentActivityItem } from "@elevapro/shared";
import { formatPse } from "@elevapro/shared";
import { Apple, ClipboardList, Dumbbell, Footprints, HeartPulse, Salad } from "lucide-react";
import Link from "next/link";

const ICONE: Record<ActivityKind, typeof Dumbbell> = {
  workout: Dumbbell,
  cardio: Footprints,
  meal: Apple,
  assessment: ClipboardList,
  diet_plan: Salad,
  body_scan: HeartPulse,
  anamnesis: ClipboardList,
};

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Distância em linguagem de conversa: "há 2 h", "ontem".
 *
 * Data absoluta obrigaria o especialista a calcular a diferença de cabeça para
 * responder a única pergunta que ele faz aqui — "isso é recente?".
 */
function quando(iso: string): string {
  const passado = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(passado) || passado < 0) return "agora";
  if (passado < HORA) return `há ${Math.max(1, Math.floor(passado / MINUTO))} min`;
  if (passado < DIA) return `há ${Math.floor(passado / HORA)} h`;
  if (passado < 2 * DIA) return "ontem";
  return `há ${Math.floor(passado / DIA)} dias`;
}

/**
 * O que aconteceu com os alunos, como contrapeso aos sinais de atenção.
 *
 * O briefing só mostrava o que estava **ruim**. "Aconteceu" entra entre os
 * sinais e as estatísticas: primeiro quem precisa de você, depois o que os
 * outros fizeram.
 *
 * O nome do aluno vem primeiro, e não o tipo de evento: numa lista de dez
 * alunos diferentes, é por ele que se procura. Cada linha leva para a aba
 * Atividades daquele aluno — o bloco é a porta de entrada do resto da feature.
 */
export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Aconteceu
      </h2>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum aluno registrou atividade ainda. Assim que treinarem ou marcarem uma refeição,
            aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((item) => {
            const Icone = ICONE[item.kind];
            return (
              <li key={item.id}>
                <Link
                  href={`/dashboard/students/${item.studentId}/activities`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-highlight focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icone className="h-3.5 w-3.5 text-primary-text" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {item.studentName}
                  </span>

                  <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
                    {item.title}
                  </span>

                  {/*
                    A PSE aparece aqui também: é o sinal mais barato de ler.
                    "Marina, PSE 8" três vezes na semana é conversa para hoje.
                  */}
                  {item.pse !== null && (
                    <span className="shrink-0 rounded-full bg-surface-highlight px-2 py-0.5 text-xs font-semibold text-foreground">
                      PSE {formatPse(item.pse)}
                    </span>
                  )}

                  <span className="shrink-0 text-xs text-muted-foreground">{quando(item.at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
