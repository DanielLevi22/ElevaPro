"use client";

import { useState } from "react";
import {
  SERVICE_TYPE,
  useEndStudentLink,
  useGenerateLinkCode,
  useStudentLinks,
} from "../hooks/useStudentLinks";

interface Props {
  studentId: string;
  isMember: boolean;
}

export function SpecialistLinkSection({ studentId, isMember }: Props) {
  const { data: links = [], isLoading } = useStudentLinks(studentId);
  const { mutateAsync: generateCode, isPending: generatingCode } = useGenerateLinkCode(studentId);
  const { mutateAsync: endLink, isPending: endingLink } = useEndStudentLink();

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerateCode() {
    setCodeError(null);
    try {
      const code = await generateCode();
      setGeneratedCode(code);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Erro ao gerar código");
    }
  }

  async function handleCopy() {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="h-24 bg-surface/40 border border-overlay-08 rounded-2xl animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        Especialistas vinculados
      </p>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum especialista vinculado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between bg-surface/60 border border-overlay-08 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-foreground">
                  {link.specialist_name ?? "Especialista"}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  {SERVICE_TYPE[link.service_type as keyof typeof SERVICE_TYPE] ??
                    link.service_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => endLink({ linkId: link.id, studentId })}
                disabled={endingLink}
                className="text-xs font-bold text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Encerrar
              </button>
            </div>
          ))}
        </div>
      )}

      {isMember && (
        <div className="flex flex-col gap-3 mt-2">
          <p className="text-xs text-muted-foreground">
            Gere um código e passe ao seu especialista para que ele confirme o vínculo.
          </p>

          {generatedCode ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-surface border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xl font-black text-primary tracking-[0.3em]">
                  {generatedCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={generatingCode}
                className="text-[10px] font-bold text-muted-foreground hover:text-muted-foreground transition-colors uppercase tracking-widest whitespace-nowrap"
              >
                Novo código
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="px-5 py-2.5 bg-surface-highlight border border-overlay-10 text-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:bg-surface-highlight transition-colors disabled:opacity-50 self-start"
            >
              {generatingCode ? "Gerando..." : "Gerar código de vínculo"}
            </button>
          )}

          {codeError && <p className="text-xs text-red-400">{codeError}</p>}
          {generatedCode && (
            <p className="text-[10px] text-muted-foreground">Código válido por 24 horas.</p>
          )}
        </div>
      )}
    </div>
  );
}
