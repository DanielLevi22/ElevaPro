"use client";

import type { ActivityAuthorFilter } from "@elevapro/shared";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStudents } from "@/shared/hooks/useStudents";
import { ActivityDayCard } from "../components/ActivityDayCard";
import { useStudentActivities } from "../hooks/useStudentActivities";

const FILTROS: { value: ActivityAuthorFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "student", label: "Aluno" },
  { value: "specialist", label: "Especialista" },
];

/**
 * O default é "Aluno" porque a pergunta que traz o especialista a esta tela é
 * "o aluno está fazendo o combinado?". O que ele mesmo fez, ele já sabe —
 * "Todos" existe para auditoria, não para o uso diário.
 */
const PADRAO: ActivityAuthorFilter = "student";

function autoriaDe(bruto: string | null): ActivityAuthorFilter {
  return FILTROS.find((f) => f.value === bruto)?.value ?? PADRAO;
}

function EstadoVazio({ author }: { author: ActivityAuthorFilter }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {author === "specialist"
          ? "Você ainda não registrou nada para este aluno."
          : "Nenhuma atividade registrada para este aluno ainda."}
      </p>
    </div>
  );
}

export default function StudentActivitiesPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = params.id as string;
  const author = autoriaDe(searchParams.get("author"));

  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);

  const { data: days = [], isLoading, isError } = useStudentActivities(studentId, author);

  /**
   * O filtro vive na URL, não em `useState`: assim ele sobrevive à navegação
   * dentro da aba e ao recarregar, e o especialista consegue mandar o link já
   * filtrado. `replace` em vez de `push` para não encher o histórico do
   * navegador com cada troca de pilha.
   */
  function trocarAutoria(valor: ActivityAuthorFilter) {
    const busca = new URLSearchParams(searchParams.toString());
    if (valor === PADRAO) busca.delete("author");
    else busca.set("author", valor);
    const query = busca.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Atividades</h1>
        {student && <p className="text-sm text-muted-foreground">{student.full_name}</p>}
      </div>

      <fieldset className="flex gap-1.5">
        <legend className="sr-only">Filtrar por autoria</legend>
        {FILTROS.map((filtro) => {
          const ativo = filtro.value === author;
          return (
            <button
              key={filtro.value}
              type="button"
              onClick={() => trocarAutoria(filtro.value)}
              aria-pressed={ativo}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                ativo
                  ? "border-primary bg-primary/10 text-primary-text"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {filtro.label}
            </button>
          );
        })}
      </fieldset>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="py-12 text-center text-muted-foreground">Erro ao carregar atividades.</p>
      )}

      {!isLoading && !isError && days.length === 0 && <EstadoVazio author={author} />}

      {!isLoading && days.length > 0 && (
        <div className="flex flex-col gap-3">
          {days.map((day) => (
            <ActivityDayCard key={day.date} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}
