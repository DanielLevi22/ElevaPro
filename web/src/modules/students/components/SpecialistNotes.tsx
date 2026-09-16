"use client";

import { NOTE_MAX_LENGTH, type SpecialistNoteWithAuthor } from "@elevapro/shared";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { formatDate } from "@/shared/utils/formatDate";
import { useSpecialistNoteMutations, useSpecialistNotes } from "../hooks/useSpecialistNotes";

/**
 * As notas do especialista sobre o progresso do aluno (issue #312 §4).
 *
 * Escrita só aqui, no web: o app do aluno lê a última do período no relatório.
 * Quem corrige e apaga é o autor, e quem confere isso é a RLS (0057) — a lista
 * mostra o que a sessão alcança, sem repetir a regra do banco em `if`.
 *
 * @example <SpecialistNotes studentId={student.id} studentName={student.full_name} />
 */
interface SpecialistNotesProps {
  studentId: string;
  /** Nulo em conta sem nome preenchido: o texto fala do aluno sem inventar um. */
  studentName: string | null;
}

export function SpecialistNotes({ studentId, studentName }: SpecialistNotesProps) {
  const { data: notes = [], isLoading } = useSpecialistNotes(studentId);
  const { write, edit, remove } = useSpecialistNoteMutations(studentId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<SpecialistNoteWithAuthor | null>(null);
  const [removing, setRemoving] = useState<SpecialistNoteWithAuthor | null>(null);

  const save = async () => {
    const body = draft.trim();
    if (!body) return;
    if (editing) await edit.mutateAsync({ id: editing.id, body });
    else await write.mutateAsync(body);
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

      <div className="rounded-2xl border border-border bg-surface p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, NOTE_MAX_LENGTH))}
          rows={4}
          placeholder="Como foi o período: o que evoluiu, o que ajustar, o que observar."
          className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
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

      {isLoading ? null : notes.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">Nenhuma nota escrita ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => startEditing(note)}
              onRemove={() => setRemoving(note)}
            />
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing) await remove.mutateAsync(removing.id);
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
  onEdit: () => void;
  onRemove: () => void;
}) {
  // Corrigida depois de escrita: a data de cima sozinha diria que o texto é de
  // uma semana que ele já não descreve.
  const corrected = note.updated_at.slice(0, 10) !== note.created_at.slice(0, 10);
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">
            {note.author_name ?? "Especialista anterior"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDate(note.created_at, "short")}
            {corrected ? ` · corrigida em ${formatDate(note.updated_at, "short")}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Corrigir
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Apagar
          </Button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {note.body}
      </p>
    </li>
  );
}
