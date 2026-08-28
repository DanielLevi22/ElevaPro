import type { ActivityDay, ActivityEvent, ActivityKind } from "@elevapro/shared";
import { formatRpe } from "@elevapro/shared";
import { Apple, ClipboardList, Dumbbell, Footprints, HeartPulse, Salad } from "lucide-react";
import { formatDate } from "@/shared/utils/formatDate";

const ICONE: Record<ActivityKind, typeof Dumbbell> = {
  workout: Dumbbell,
  cardio: Footprints,
  meal: Apple,
  assessment: ClipboardList,
  diet_plan: Salad,
  body_scan: HeartPulse,
  anamnesis: ClipboardList,
};

/**
 * Resumo do dia em uma linha, a partir de `daily_goals`.
 *
 * A meta aparece junto com o realizado porque "3 refeições" não diz nada e
 * "3/4" diz. Devolve `null` quando a gamificação não gerou linha para o dia —
 * inventar "0/0" faria um dia sem meta parecer um dia falhado.
 */
function resumoDoDia(day: ActivityDay): string | null {
  if (!day.summary) return null;
  const { mealsTarget, mealsCompleted, workoutTarget, workoutCompleted, completed } = day.summary;
  if (completed) return "dia completo";

  const partes: string[] = [];
  if (workoutTarget > 0) partes.push(`Treino ${workoutCompleted}/${workoutTarget}`);
  if (mealsTarget > 0) partes.push(`Refeições ${mealsCompleted}/${mealsTarget}`);
  return partes.length > 0 ? partes.join(" · ") : null;
}

function EventRow({ event }: { event: ActivityEvent }) {
  const Icone = ICONE[event.kind];

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icone className="h-3.5 w-3.5 text-primary-text" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p className="font-medium text-foreground">{event.title}</p>
          {/* Sem campo vazio e sem "—": evento sem detalhe simplesmente some. */}
          {event.detail && <span className="text-sm text-muted-foreground">{event.detail}</span>}
          {event.rpe !== null && (
            <span className="rounded-full bg-surface-highlight px-2 py-0.5 text-xs font-semibold text-foreground">
              RPE {formatRpe(event.rpe)}
            </span>
          )}
        </div>

        {/*
          O texto do aluno fica visualmente separado do que o app gerou. São
          campos distintos no banco desde a `0035`, e a tela não os mistura de
          volta: o especialista precisa saber o que é relato e o que é medida.
        */}
        {event.studentNote && (
          <p className="mt-1.5 border-l-2 border-border pl-2.5 text-sm italic text-muted-foreground">
            “{event.studentNote}”
          </p>
        )}
      </div>
    </li>
  );
}

export function ActivityDayCard({ day }: { day: ActivityDay }) {
  const resumo = resumoDoDia(day);
  const vazio = day.events.length === 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2.5">
        <h3 className="font-semibold text-foreground">
          {formatDate(day.date, "medium")}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {formatDate(day.date, "weekday")}
          </span>
        </h3>
        <span
          className={`text-xs font-semibold ${
            day.summary?.completed ? "text-success" : "text-muted-foreground"
          }`}
        >
          {/*
            Dia sem nada aparece como "sem registro" em vez de sumir da lista:
            para o especialista a ausência é a informação — três dias vazios
            seguidos é o que ele precisa ver, e uma lista que pula de 28 para 24
            esconde isso atrás de uma conta que ninguém faz de cabeça.
          */}
          {resumo ?? (vazio ? "sem registro" : "")}
        </span>
      </header>

      {!vazio && (
        <ul className="divide-y divide-border">
          {day.events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}
