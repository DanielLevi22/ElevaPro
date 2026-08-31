/**
 * O que o aparelho mediu, convertido para centímetro e escrito para o prompt.
 *
 * O aparelho mede em pixels porque não conhece a altura do aluno — o portão de
 * elegibilidade responde **se** ele pode escanear e **de onde** viria a Escala,
 * nunca **quanto**, porque a medida é dado de saúde e não deve atravessar a
 * fronteira sem finalidade (Art. 6º, III). A divisão acontece aqui, onde a
 * Escala já foi resolvida (`ADR-0022`).
 *
 * Puro de propósito: é a conta que substitui a estimativa visual do modelo, e
 * uma conta que ninguém consegue verificar sozinha não substitui nada.
 */

import type { MedidasGeometricas } from "@elevapro/shared";

export type Pose = "front" | "back" | "side";

/** O que o módulo nativo devolve por foto. Pixels e graus, nunca centímetro. */
export interface MedidaDaFoto {
  alturaPx: number;
  larguraPescocoPx: number | null;
  larguraPeitoPx: number | null;
  larguraCinturaPx: number | null;
  larguraQuadrilPx: number | null;
  larguraCoxaPx: number | null;
  larguraPanturrilhaPx: number | null;
  larguraOmbrosPx: number | null;
  desnivelOmbrosPx: number | null;
  desnivelQuadrilPx: number | null;
  inclinacaoOmbrosGraus: number | null;
  inclinacaoQuadrilGraus: number | null;
  desvioDoEixoPx: number | null;
  rotacaoDoTronco: number | null;
  anguloCraniovertebralGraus: number | null;
  prumoOmbroPx: number | null;
  prumoQuadrilPx: number | null;
  prumoJoelhoPx: number | null;
}

export type MedidasPorPose = Partial<Record<Pose, MedidaDaFoto>>;

/**
 * A partir de quanto a rotação de tronco muda a leitura.
 *
 * Compartilhado entre o aviso do prompt e o veredito gravado: com dois valores,
 * o laudo poderia alertar sobre perspectiva enquanto a coluna dizia que a foto
 * estava reta.
 */
const ROTACAO_QUE_IMPORTA = 0.08;

const NOME_DA_POSE: Record<Pose, string> = {
  front: "frente",
  back: "costas",
  side: "lateral",
};

/**
 * Quantos pixels valem um centímetro naquela foto.
 *
 * Cada pose tem a sua: o aluno não para exatamente na mesma distância nas três,
 * e usar a escala de uma foto para converter outra deslocaria as larguras sem
 * ninguém perceber.
 */
function pixelsPorCentimetro(medida: MedidaDaFoto, alturaCm: number): number | null {
  if (medida.alturaPx <= 0 || alturaCm <= 0) return null;

  return medida.alturaPx / alturaCm;
}

const cm = (px: number | null, escala: number): string | null =>
  px === null ? null : `${(Math.abs(px) / escala).toFixed(1)} cm`;

const graus = (valor: number | null): string | null =>
  valor === null ? null : `${Math.abs(valor).toFixed(1)}°`;

/** Qual ombro está mais alto, pelo sinal do desnível. Positivo é o direito. */
function ladoMaisAlto(desnivelPx: number): string {
  return desnivelPx > 0 ? "direito" : "esquerdo";
}

function larguras(medida: MedidaDaFoto, escala: number): string[] {
  const niveis: Array<[string, number | null]> = [
    ["pescoço", medida.larguraPescocoPx],
    ["peito", medida.larguraPeitoPx],
    ["cintura", medida.larguraCinturaPx],
    ["quadril", medida.larguraQuadrilPx],
    ["coxa", medida.larguraCoxaPx],
    ["panturrilha", medida.larguraPanturrilhaPx],
  ];

  return niveis
    .map(([nome, px]) => {
      const valor = cm(px, escala);

      return valor === null ? null : `  - largura de ${nome}: ${valor}`;
    })
    .filter((linha): linha is string => linha !== null);
}

function assimetrias(medida: MedidaDaFoto, escala: number): string[] {
  const linhas: string[] = [];

  if (medida.desnivelOmbrosPx !== null && medida.inclinacaoOmbrosGraus !== null) {
    linhas.push(
      `  - ombro ${ladoMaisAlto(medida.desnivelOmbrosPx)} mais alto: ` +
        `${cm(medida.desnivelOmbrosPx, escala)} (${graus(medida.inclinacaoOmbrosGraus)} da horizontal)`,
    );
  }

  if (medida.desnivelQuadrilPx !== null && medida.inclinacaoQuadrilGraus !== null) {
    linhas.push(
      `  - quadril ${ladoMaisAlto(medida.desnivelQuadrilPx)} mais alto: ` +
        `${cm(medida.desnivelQuadrilPx, escala)} (${graus(medida.inclinacaoQuadrilGraus)} da horizontal)`,
    );
  }

  if (medida.desvioDoEixoPx !== null) {
    linhas.push(`  - desvio do eixo cabeça-tornozelos: ${cm(medida.desvioDoEixoPx, escala)}`);
  }

  // Rotação de tronco não é achado postural: é aviso de que a foto dita frontal
  // não era frontal, e sem ela o modelo lê perspectiva como assimetria.
  if (medida.rotacaoDoTronco !== null && Math.abs(medida.rotacaoDoTronco) > ROTACAO_QUE_IMPORTA) {
    linhas.push(
      "  - ATENÇÃO: tronco rotacionado nesta foto. Assimetrias aqui podem ser perspectiva.",
    );
  }

  return linhas;
}

function postura(medida: MedidaDaFoto, escala: number): string[] {
  const linhas: string[] = [];

  if (medida.anguloCraniovertebralGraus !== null) {
    linhas.push(`  - ângulo craniovertebral: ${graus(medida.anguloCraniovertebralGraus)}`);
  }

  const prumos: Array<[string, number | null]> = [
    ["ombro", medida.prumoOmbroPx],
    ["quadril", medida.prumoQuadrilPx],
    ["joelho", medida.prumoJoelhoPx],
  ];

  for (const [nome, px] of prumos) {
    const valor = cm(px, escala);
    if (valor !== null) linhas.push(`  - ${nome} à frente do prumo do tornozelo: ${valor}`);
  }

  return linhas;
}

/**
 * O bloco de fatos medidos, pronto para o prompt.
 *
 * Devolve `null` quando não há nada medido — e aí o prompt segue sem o bloco,
 * em vez de afirmar um cabeçalho vazio.
 *
 * @example
 * const bloco = descreverFatosMedidos(medidas, 175);
 * // "MEDIDO NO APARELHO ...\n- na foto de frente (escala 5.1 px/cm):\n  - largura de cintura: 32.4 cm"
 */
export function descreverFatosMedidos(medidas: MedidasPorPose, alturaCm: number): string | null {
  const blocos: string[] = [];

  for (const pose of ["front", "back", "side"] as const) {
    const medida = medidas[pose];
    if (!medida) continue;

    const escala = pixelsPorCentimetro(medida, alturaCm);
    if (escala === null) continue;

    const linhas = [
      ...larguras(medida, escala),
      ...assimetrias(medida, escala),
      ...postura(medida, escala),
    ];

    if (linhas.length === 0) continue;

    blocos.push(
      `- na foto de ${NOME_DA_POSE[pose]} (escala ${escala.toFixed(1)} px/cm):\n${linhas.join("\n")}`,
    );
  }

  if (blocos.length === 0) return null;

  return [
    "MEDIDO NO APARELHO — não estime nenhuma destas, são medidas:",
    "",
    ...blocos,
    "",
    "As larguras são da SILHUETA: elas incluem a roupa, e largura não é circunferência.",
    "Use-as como evidência para o que você observa, não como resultado final.",
  ].join("\n");
}

const emCm = (px: number | null | undefined, escala: number | null): number | null =>
  px === null || px === undefined || escala === null ? null : Number((px / escala).toFixed(2));

const arredondar = (valor: number | null | undefined): number | null =>
  valor === null || valor === undefined ? null : Number(valor.toFixed(2));

/**
 * As mesmas medidas do prompt, em número, para gravar no scan.
 *
 * Divide o mesmo par de funções que `descreverFatosMedidos` usa para escrever o
 * texto: se a conta vivesse duas vezes, o laudo poderia dizer 1,8 cm enquanto a
 * coluna guardava outro valor — e o especialista não teria como saber qual dos
 * dois olhar.
 *
 * O sinal é preservado, ao contrário do texto: lá o lado vira palavra, aqui ele
 * vira o sinal do número, e perder isso apontaria o ombro errado no histórico.
 *
 * @example
 * const gravar = medidasParaOScan(medidas, 175);
 * // { px_per_cm_front: 5.14, shoulder_drop_cm: -1.8, ... }
 */
export function medidasParaOScan(medidas: MedidasPorPose, alturaCm: number): MedidasGeometricas {
  const escalas = {
    front: medidas.front ? pixelsPorCentimetro(medidas.front, alturaCm) : null,
    back: medidas.back ? pixelsPorCentimetro(medidas.back, alturaCm) : null,
    side: medidas.side ? pixelsPorCentimetro(medidas.side, alturaCm) : null,
  };

  // A frontal é quem tem assimetria: de costas os lados invertem, e de perfil
  // um ombro esconde o outro. Gravar a média das três misturaria vistas que não
  // medem a mesma coisa.
  const frente = medidas.front;
  const lateral = medidas.side;

  return {
    px_per_cm_front: arredondar(escalas.front),
    px_per_cm_back: arredondar(escalas.back),
    px_per_cm_side: arredondar(escalas.side),
    shoulder_drop_cm: emCm(frente?.desnivelOmbrosPx, escalas.front),
    shoulder_tilt_deg: arredondar(frente?.inclinacaoOmbrosGraus),
    hip_drop_cm: emCm(frente?.desnivelQuadrilPx, escalas.front),
    hip_tilt_deg: arredondar(frente?.inclinacaoQuadrilGraus),
    axis_deviation_cm: emCm(frente?.desvioDoEixoPx, escalas.front),
    trunk_rotated:
      frente?.rotacaoDoTronco === null || frente?.rotacaoDoTronco === undefined
        ? null
        : Math.abs(frente.rotacaoDoTronco) > ROTACAO_QUE_IMPORTA,
    craniovertebral_angle_deg: arredondar(lateral?.anguloCraniovertebralGraus),
    plumb_shoulder_cm: emCm(lateral?.prumoOmbroPx, escalas.side),
    plumb_hip_cm: emCm(lateral?.prumoQuadrilPx, escalas.side),
    plumb_knee_cm: emCm(lateral?.prumoJoelhoPx, escalas.side),
  };
}
