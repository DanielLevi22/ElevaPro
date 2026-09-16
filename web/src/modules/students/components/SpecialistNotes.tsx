"use client";

import { NOTE_MAX_LENGTH, type SpecialistNoteWithAuthor } from "@elevapro/shared";
import { useState } from "react";
import { useAuth } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { Textarea } from "@/shared/components/ui/Textarea";
import { formatDate } from "@/shared/utils/formatDate";
import { useSpecialistNoteMutations, useSpecialistNotes } from "../hooks/useSpecialistNotes";

/**
 * As notas do especialista sobre o progresso do aluno (issue #312 §4).
 *
 * Escrita só aqui, no web: o app do aluno lê a última do período no relatório.
 * O CASL decide o que a tela oferece e a RLS (0057) decide o que o banco aceita:
 * sem `manage`, nem o campo de escrever aparece — e a leitura continua sendo o
 * que a sessão alcança, sem repetir a regra do banco em `if`.
 *
 * @example <SpecialistNotes studentId={student.id} studentName={student.full_name} />
 */
interface SpecialistNotesProps {
  studentId: string;
  /** Nulo em conta sem nome preenchido: o texto fala do aluno sem inventar um. */
  studentName: string | null;
}

export function SpecialistNotes({ studentId, studentName }: SpecialistNotesProps) {
  const { abilities } = useAuth();
  const canWrite = abilities?.can("manage", "SpecialistNote") ?? false;
  const { data: notes = [], isLoading } = useSpecialistNotes(studentId);
  const { write, edit, remove } = useSpecialistNoteMutations(studentId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<SpecialistNoteWithAuthor | null>(null);
  const [removing, setRemoving] = useState<SpecialistNoteWithAuthor | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // A RLS não recusa com erro: ela não devolve linha, e o serviço transforma isso
  // em exceção. Sem este catch, corrigir a nota de outro especialista limpava o
  // campo como se tivesse salvado.
  const save = async () => {
    const body = draft.trim();
    if (!body) return;
    setFailure(null);
    try {
      if (editing) await edit.mutateAsync({ id: editing.id, body });
      else await write.mutateAsync(body);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Não foi possível salvar a nota.");
      return;
    }
    setDraft("");
    setEditing(null);
  };

  const startEditing = (note: SpecialistNoteWithAuthor) => {
    setEditing(note);
    setDraft(note.body);
  };

  return (
    <section className="mt-6">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
        Notas de progresso
      </h2>
      <p className="mt-1 mb-4 text-xs text-muted-foreground">
        {`O que você escrever aqui ${studentName?.split(" ")[0] ?? "o aluno"} lê no relatório do período dele.`}
      </p>

      {canWrite ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, NOTE_MAX_LENGTH))}
            rows={4}
            placeholder="Como foi o período: o que evoluiu, o que ajustar, o que observar."
            error={failure !== null}
          />
          {failure ? <p className="mt-2 text-xs text-red-400">{failure}</p> : null}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">
              {`${draft.length} / ${NOTE_MAX_LENGTH}`}
            </span>
            <div className="flex gap-2">
              {editing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setDraft("");
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={save}
                disabled={!draft.trim() || write.isPending || edit.isPending}
              >
                {editing ? "Salvar correção" : "Escrever nota"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? null : notes.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">Nenhuma nota escrita ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={canWrite ? () => startEditing(note) : undefined}
              onRemove={canWrite ? () => setRemoving(note) : undefined}
            />
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          try {
            if (removing) await remove.mutateAsync(removing.id);
          } catch (error) {
            setFailure(error instanceof Error ? error.message : "Não foi possível apagar a nota.");
          }
          setRemoving(null);
        }}
        title="Apagar a nota?"
        description="A nota sai do relatório do aluno. Isso não pode ser desfeito."
        confirmLabel="Apagar"
        variant="danger"
        isLoading={remove.isPending}
      />
    </section>
  );
}

function NoteCard({
  note,
  onEdit,
  onRemove,
}: {
  note: SpecialistNoteWithAuthor;
  /** Ausentes para quem só lê: o aluno vê a nota, e não os botões dela. */
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  // Corrigida depois de escrita: a data de cima sozinha diria que o texto é de
  // uma semana que ele já não descreve. Comparado por instante, e não por dia:
  // a correção feita na mesma tarde também mudou o que a nota diz.
  const corrected = note.updated_at !== note.created_at;
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">
            {note.author_name ?? "Especialista anterior"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDate(note.created_at, "short")}
            {corrected ? ` · ${correctionLabel(note)}` : ""}
          </p>
        </div>
        {onEdit && onRemove ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Corrigir
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove}>
              Apagar
            </Button>
          </div>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {note.body}
      </p>
    </li>
  );
}

/** No mesmo dia a data repetida não diz nada; em outro, ela é a informação. */
function correctionLabel(note: SpecialistNoteWithAuthor): string {
  const sameDay = note.updated_at.slice(0, 10) === note.created_at.slice(0, 10);
  return sameDay ? "corrigida" : `corrigida em ${formatDate(note.updated_at, "short")}`;
}
