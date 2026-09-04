import type { StudentContext } from "../types";

/**
 * Com que dados o coach está trabalhando nesta conversa.
 *
 * Quem abre o chat não sabia o que o modelo enxerga do aluno. Anamnese,
 * avaliação física, análise corporal e periodização entram no prompt a cada
 * turno, e nada disso aparecia na tela — então o especialista não sabia se a
 * sugestão levou a lesão em conta ou se o coach estava trabalhando no escuro.
 * Ele descobria tarde, pela resposta genérica.
 *
 * ⚠️ **Só a existência do dado atravessa daqui, nunca o valor.** "Anamnese
 * respondida" é neutro; "asma" ou "hérnia de disco" na tela é dado de saúde de
 * titular identificado (Art. 11), com base legal e destinatário próprios. O
 * `detail` é contagem ou motivo — nunca conteúdo.
 *
 * @example
 * const blocos = resumirDisponibilidade(ctx, temBodyScan);
 * // [{ key: "anamnese", label: "Anamnese", present: true }, …]
 */
export interface BlocoDeContexto {
  /** Chave estável para a tela; o rótulo é para a pessoa. */
  key: "anamnese" | "avaliacao" | "body_scan" | "periodizacoes";
  label: string;
  present: boolean;
  /** Contagem, ou por que não veio. Nunca o dado. */
  detail?: string;
}

/** Os campos que vêm da anamnese, e não da avaliação física. */
const CAMPOS_DA_ANAMNESE = [
  "objective",
  "trainingExperience",
  "trainingFrequency",
  "availableDays",
  "injuries",
  "healthConditions",
] as const;

/** Os que vêm da última avaliação física. */
const CAMPOS_DA_AVALIACAO = ["weightKg", "heightCm", "bodyFatPct"] as const;

export function resumirDisponibilidade(
  ctx: StudentContext,
  temBodyScan: boolean,
): BlocoDeContexto[] {
  const saude = ctx.health;

  // Sem consentimento não é o mesmo que sem dado: o aluno pode ter anamnese
  // inteira preenchida e o coach continuar sem poder lê-la. Dizer "não
  // respondida" aqui seria mentira, e mandaria o especialista pedir de novo
  // algo que já existe.
  const semConsentimento = ctx.healthUnavailableReason === "no_consent";
  const motivo = semConsentimento ? "sem consentimento do aluno" : undefined;

  const temAlgum = (campos: readonly string[]): boolean =>
    saude !== null && campos.some((campo) => saude[campo as keyof typeof saude] !== undefined);

  const quantas = ctx.periodizations.length;

  return [
    {
      key: "anamnese",
      label: "Anamnese",
      present: temAlgum(CAMPOS_DA_ANAMNESE),
      detail: motivo,
    },
    {
      key: "avaliacao",
      label: "Avaliação física",
      present: temAlgum(CAMPOS_DA_AVALIACAO),
      detail: motivo,
    },
    {
      key: "body_scan",
      label: "Análise corporal",
      present: temBodyScan,
      detail: motivo,
    },
    {
      key: "periodizacoes",
      label: "Periodizações",
      present: quantas > 0,
      detail: quantas > 0 ? `${quantas} salva${quantas > 1 ? "s" : ""}` : undefined,
    },
  ];
}
