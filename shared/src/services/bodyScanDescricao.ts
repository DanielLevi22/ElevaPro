import type { BodyScanRecord } from "../types/bodyScan.types";

/**
 * Como se lê um scan corporal: quais campos, com que nome e em que unidade.
 *
 * Mora no `shared` porque tem três consumidores que não podem se importar entre
 * si — a tela do aluno, a tela do especialista e o contexto que vai para o chat
 * de treino e dieta. Com a tabela copiada em cada um, um campo novo apareceria
 * em duas telas e sumiria da terceira, sem erro de tipo em lugar nenhum.
 *
 * A ordem é a de leitura, de cima para baixo.
 */

export interface CampoMedido {
  campo: keyof BodyScanRecord;
  rotulo: string;
  unidade: string;
  /** Medidas com lado: o sinal vira palavra e o número perde o sinal. */
  lados?: [string, string];
}

export const MEDIDAS_DO_SCAN: CampoMedido[] = [
  {
    campo: "shoulder_drop_cm",
    rotulo: "Desnível dos ombros",
    unidade: "cm",
    lados: ["direito mais alto", "esquerdo mais alto"],
  },
  { campo: "shoulder_tilt_deg", rotulo: "Inclinação dos ombros", unidade: "°" },
  {
    campo: "hip_drop_cm",
    rotulo: "Desnível do quadril",
    unidade: "cm",
    lados: ["direito mais alto", "esquerdo mais alto"],
  },
  { campo: "hip_tilt_deg", rotulo: "Inclinação do quadril", unidade: "°" },
  { campo: "axis_deviation_cm", rotulo: "Desvio do eixo cabeça-tornozelos", unidade: "cm" },
  { campo: "craniovertebral_angle_deg", rotulo: "Ângulo craniovertebral", unidade: "°" },
  { campo: "plumb_shoulder_cm", rotulo: "Ombro à frente do prumo", unidade: "cm" },
  { campo: "plumb_hip_cm", rotulo: "Quadril à frente do prumo", unidade: "cm" },
  { campo: "plumb_knee_cm", rotulo: "Joelho à frente do prumo", unidade: "cm" },
];

export interface LinhaMedida {
  campo: string;
  rotulo: string;
  /** Sempre positivo. O lado vive em `lado`. */
  valor: number;
  unidade: string;
  lado: string | null;
}

/** As linhas que têm valor. Campo não medido some, em vez de virar zero. */
export function linhasMedidas(scan: BodyScanRecord): LinhaMedida[] {
  return MEDIDAS_DO_SCAN.flatMap((medida) => {
    const bruto = scan[medida.campo];
    if (typeof bruto !== "number") return [];

    return [
      {
        campo: medida.campo,
        rotulo: medida.rotulo,
        valor: Math.abs(bruto),
        unidade: medida.unidade,
        lado: medida.lados ? (bruto > 0 ? medida.lados[0] : medida.lados[1]) : null,
      },
    ];
  });
}

/**
 * As ressalvas daquela captura, na ordem em que mudam a leitura.
 *
 * Vão sempre junto das medidas, nunca depois: número sem a ressalva é pior que
 * número nenhum, porque quem lê decide em cima dele achando que está firme.
 */
export function ressalvasDoScan(scan: BodyScanRecord): string[] {
  const ressalvas: string[] = [];

  if (scan.trunk_rotated) {
    ressalvas.push(
      "O tronco estava rotacionado na foto frontal — assimetria aqui pode ser perspectiva.",
    );
  }
  if (scan.framing_confirmed === false) {
    ressalvas.push(
      "O enquadramento não foi confirmado: o aluno capturou pela saída manual, e a escala pode estar deslocada.",
    );
  }
  if (scan.quality_backlit) ressalvas.push("Contraluz na captura.");
  if (scan.quality_low_light) ressalvas.push("Cômodo escuro na captura.");
  if (scan.quality_blown_out) ressalvas.push("Luz estourada na captura.");

  return ressalvas;
}
