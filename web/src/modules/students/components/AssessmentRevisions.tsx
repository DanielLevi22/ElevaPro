"use client";

import { ASSESSMENT_FIELD_LABELS, type AssessmentRevision } from "@elevapro/shared";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { formatDate } from "@/shared/utils/formatDate";
import { assessmentClient } from "../services/AssessmentClientService";

/** Mostra o acervo retificado somente enquanto aberto. Ex.: <AssessmentRevisions studentId={studentId} assessmentId={id} onClose={close} />. */
export function AssessmentRevisions({
  studentId,
  assessmentId,
  onClose,
}: {
  studentId: string;
  assessmentId: string;
  onClose: () => void;
}) {
  const [revisions, setRevisions] = useState<AssessmentRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt é o gatilho explícito de nova tentativa após falha.
  useEffect(() => {
    const controller = new AbortController();
    setRevisions(null);
    setError(null);
    assessmentClient
      .revisions(studentId, assessmentId, controller.signal)
      .then((versions) => {
        if (!controller.signal.aborted) setRevisions(versions);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Não foi possível consultar as correções.",
          );
      });
    return () => controller.abort();
  }, [studentId, assessmentId, attempt]);
  return (
    <Dialog open onClose={onClose} title="Histórico de correções" maxWidth="lg" scrollable>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Estas versões foram retificadas e não entram nos gráficos nem nas comparações.
        </p>
        {!revisions && !error && <p role="status">Carregando correções...</p>}
        {error && (
          <div>
            <p role="alert">{error}</p>
            <Button variant="ghost" onClick={() => setAttempt((value) => value + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}
        {revisions?.length === 0 && <p>Nenhuma correção registrada.</p>}
        {revisions?.map((revision) => (
          <section key={revision.id} className="space-y-3 border border-border rounded-xl p-4">
            <h3 className="font-semibold">
              Versão retificada em {formatDate(revision.corrected_at, "dateTime")}
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {ASSESSMENT_FIELD_LABELS.map(
                ({ key, label, unit }) =>
                  revision.previous_values[key] !== null && (
                    <div key={key}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd>
                        {revision.previous_values[key]} {unit}
                      </dd>
                    </div>
                  ),
              )}
            </dl>
            {revision.previous_values.notes && (
              <p className="text-sm">{revision.previous_values.notes}</p>
            )}
          </section>
        ))}
      </div>
    </Dialog>
  );
}
