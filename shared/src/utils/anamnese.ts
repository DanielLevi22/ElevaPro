/**
 * Leitura das respostas numéricas da Anamnese.
 *
 * Vive em `shared/` porque as duas pontas gravam a mesma pergunta de formas
 * diferentes: o web converte o valor antes de guardar, o mobile guarda o texto
 * cru do campo. Quem consome — o coach de IA, o contexto nutricional, a Escala
 * da análise corporal — não pode depender de qual aparelho o aluno tinha na mão.
 *
 * A conversão mora aqui, e não em cada consumidor: cada leitor que normaliza por
 * conta própria é uma cópia da regra que diverge da seguinte.
 */

/** Por que a resposta não virou número. A ação do chamador é diferente em cada. */
export type MotivoRecusa = "ausente" | "nao_numerico" | "fora_de_faixa";

/**
 * Recusar é um resultado, não uma exceção.
 *
 * Um `throw` obrigaria cada chamador a envolver a leitura em `try`, e o que
 * costuma acontecer nesse caso é o `catch` vazio — que transforma "o aluno
 * digitou errado" em "o aluno não respondeu", duas situações com remédios
 * opostos.
 */
export type RespostaNumerica = { ok: true; valor: number } | { ok: false; motivo: MotivoRecusa };

interface Faixa {
  min: number;
  max: number;
}

/**
 * Faixa plausível por pergunta.
 *
 * Pergunta sem entrada aqui não tem faixa: o número é aceito como veio. Faixa
 * inventada recusaria resposta legítima, que é pior do que não conferir.
 */
const FAIXAS: Record<string, Faixa> = {
  height: { min: 100, max: 250 },
  weight: { min: 30, max: 300 },
};

export function lerRespostaNumerica(bruto: unknown, pergunta: string): RespostaNumerica {
  if (bruto === null || bruto === undefined || bruto === "") {
    return { ok: false, motivo: "ausente" };
  }

  // A vírgula vem do teclado numérico do Android, que a oferece no lugar do
  // ponto. `Number("75,5")` é NaN — sem esta troca o peso do aluno viraria
  // ausente por causa da tecla que ele tinha à mão.
  const texto = typeof bruto === "string" ? bruto.replace(",", ".") : bruto;
  const bruta = Number(texto);

  if (!Number.isFinite(bruta)) return { ok: false, motivo: "nao_numerico" };

  const faixa = FAIXAS[pergunta];
  const valor = emCentimetro(bruta, pergunta, faixa);

  if (faixa && (valor < faixa.min || valor > faixa.max)) {
    return { ok: false, motivo: "fora_de_faixa" };
  }

  return { ok: true, valor };
}

/**
 * Metro convertido em centímetro, só para a altura.
 *
 * A pergunta pede centímetro, mas parte dos alunos responde na unidade em que
 * pensa a própria altura — e 1,75 não é uma altura implausível, é a mesma
 * altura na outra unidade. Recusá-la mandaria corrigir um valor certo.
 *
 * Só a altura tem essa ambiguidade: 1,75 kg é erro de digitação, não outra
 * unidade, e converter inventaria 175 kg a partir de um dedo escorregado.
 */
function emCentimetro(bruta: number, pergunta: string, faixa: Faixa | undefined): number {
  if (pergunta !== "height" || !faixa || bruta >= faixa.min) return bruta;
  // Arredondado porque 1.83 * 100 é 183.00000000000003, e essa cauda chegaria
  // inteira ao prompt da análise corporal.
  return Math.round(bruta * 100);
}
