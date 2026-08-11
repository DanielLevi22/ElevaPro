"use client";

import { useParams } from "next/navigation";
import { useStudents } from "@/shared/hooks/useStudents";
import { formatDate } from "@/shared/utils/formatDate";
import type { HistoryEvent } from "../hooks/useStudentHistory";
import { useStudentHistory } from "../hooks/useStudentHistory";

function EventIcon({ type }: { type: HistoryEvent["type"] }) {
  if (type === "workout_session") {
    return (
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <svg
          className="w-4 h-4 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
    );
  }

  if (type === "physical_assessment") {
    return (
      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
        <svg
          className="w-4 h-4 text-accent"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
      <svg
        className="w-4 h-4 text-secondary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status?: HistoryEvent["status"] }) {
  if (!status) return null;
  if (status === "completed") {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
        Concluído
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
      Em andamento
    </span>
  );
}

export default function StudentHistoryPage() {
  const params = useParams();
  const studentId = params.id as string;

  const { data: students = [] } = useStudents();
  const student = students.find((s) => s.id === studentId);

  const { data: events = [], isLoading, isError } = useStudentHistory(studentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          {student && <p className="text-sm text-muted-foreground">{student.full_name}</p>}
        </div>
      </div>

      {/* Timeline */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-white/10 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Erro ao carregar histórico.</p>
        </div>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <div className="text-center py-16 bg-surface border border-white/10 rounded-2xl">
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Sem histórico</h3>
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade registrada para este aluno ainda.
          </p>
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-5 bottom-5 w-px bg-white/10" aria-hidden="true" />

          <div className="flex flex-col gap-1">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 py-3 pl-0 relative group">
                <div className="z-10">
                  <EventIcon type={event.type} />
                </div>

                <div className="flex-1 min-w-0 bg-surface border border-white/10 rounded-xl p-4 group-hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{event.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={event.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(event.date, "dateTime")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
