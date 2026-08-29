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

/**
 * O valor por trás do embrulho do mobile.
 *
 * A coluna `responses` guarda duas formas na mesma chave: o web grava o valor
 * direto (`{ height: 175 }`) e o mobile grava embrulhado
 * (`{ height: { questionId: "height", value: 175 } }`). Quem lê sem desembrulhar
 * recebe o objeto no lugar do valor — e `Number({...})` é NaN, então a resposta
 * de quem preencheu pelo celular vira "não numérica".
 */
function desembrulhar(entrada: unknown): unknown {
  if (
    entrada !== null &&
    typeof entrada === "object" &&
    !Array.isArray(entrada) &&
    "value" in entrada
  ) {
    return (entrada as { value: unknown }).value;
  }
  return entrada;
}

export function lerRespostaNumerica(entrada: unknown, pergunta: string): RespostaNumerica {
  const bruto = desembrulhar(entrada);

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

/**
 * O texto de uma resposta aberta, ou `undefined` quando não há resposta.
 *
 * Sem tipo de resultado, ao contrário da leitura numérica: aqui não existe
 * "respondeu errado". Ou o aluno escreveu algo, ou não escreveu — e inventar um
 * motivo de recusa para um campo livre seria cerimônia sem variação por trás.
 *
 * @example
 * lerRespostaTexto(respostas.injuries, "injuries"); // "Hérnia de disco L5-S1"
 */
export function lerRespostaTexto(entrada: unknown, _pergunta: string): string | undefined {
  const bruto = desembrulhar(entrada);
  if (bruto === null || bruto === undefined) return undefined;

  const texto = String(bruto).trim();
  return texto.length > 0 ? texto : undefined;
}

/**
 * O mapa de respostas achatado, venha ele embrulhado ou já plano.
 *
 * Existe porque as duas formas convivem na mesma coluna: quem gravou antes desta
 * correção trouxe `{ questionId, value }` em toda chave. Achatar na carga é o
 * que permite a tela ler o valor direto sem mostrar campo vazio a quem já
 * respondeu.
 *
 * @example
 * achatarRespostas({ height: { questionId: "height", value: 175 } }); // { height: 175 }
 */
export function achatarRespostas(
  respostas: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!respostas) return {};

  return Object.fromEntries(
    Object.entries(respostas).map(([chave, valor]) => [chave, desembrulhar(valor)]),
  );
}
