"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useLinkByCode } from "../hooks/useLinkByCode";

interface LinkByCodeDialogProps {
  open: boolean;
  specialistId: string | null;
  onClose: () => void;
  /** Depois de ligar um aluno pelo código dele: a lista precisa recarregar. */
  onLinked: () => void;
}

/**
 * "Vincular por código" (#365). Quem já tem conta — o Praticante — não entra
 * pelo convite por e-mail: o especialista gera o código dele para o aluno
 * digitar, ou digita o código que o aluno gerou.
 *
 * @example <LinkByCodeDialog open specialistId={user.id} onClose={fechar} onLinked={router.refresh} />
 */
export function LinkByCodeDialog({ open, specialistId, onClose, onLinked }: LinkByCodeDialogProps) {
  const { generate, redeem } = useLinkByCode(specialistId);
  const [typed, setTyped] = useState("");

  // Um código novo a cada abertura: gerar apaga o anterior.
  // biome-ignore lint/correctness/useExhaustiveDependencies: gerar só ao abrir
  useEffect(() => {
    if (open) generate.mutate();
  }, [open]);

  const submit = async () => {
    await redeem.mutateAsync(typed);
    setTyped("");
    onLinked();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vincular aluno por código"
      description="Para quem já tem conta no Eleva Pro. O código vale por 24 horas e é usado uma vez só."
      maxWidth="md"
    >
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Passe este código ao aluno. Ele digita no app e passa a ser acompanhado por você.
        </p>
        <p
          aria-live="polite"
          className="rounded-xl border border-primary/20 bg-surface px-4 py-3 text-center text-2xl font-black tracking-[0.3em] text-primary"
        >
          {generate.data ?? (generate.isError ? "—" : "······")}
        </p>
        {generate.isError ? <p className="text-xs text-red-400">{generate.error.message}</p> : null}
      </section>

      <form
        className="mt-6 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (typed.trim()) void submit().catch(() => undefined);
        }}
      >
        <label htmlFor="student-code" className="text-sm text-muted-foreground">
          Ou digite o código que o aluno te passou.
        </label>
        <div className="flex gap-2">
          <input
            id="student-code"
            value={typed}
            onChange={(event) => setTyped(event.target.value.toUpperCase())}
            placeholder="Ex.: K7Q2MX"
            autoComplete="off"
            className="flex-1 rounded-xl border border-overlay-10 bg-surface px-4 py-2.5 text-sm tracking-[0.2em] text-foreground"
          />
          <Button type="submit" disabled={redeem.isPending || !typed.trim()}>
            {redeem.isPending ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
        {redeem.isError ? <p className="text-xs text-red-400">{redeem.error.message}</p> : null}
      </form>
    </Dialog>
  );
}
