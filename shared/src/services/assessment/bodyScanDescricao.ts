import type { MedidasDoAparelho, MedidasGeometricas } from "../../types/bodyScan.types";

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

/**
 * Abaixo disto a inclinação não se distingue da torção do aparelho.
 *
 * É o mesmo limite que o portão impõe ao roll, e não por acaso: a imagem gira
 * junto com o celular, então a torção tolerada é a incerteza da medida. Medido
 * no aparelho, dois scans seguidos com roll de sinais opostos (+1,10° e −1,00°)
 * produziram inclinações de ombro e quadril que trocaram de sinal junto e
 * vieram idênticas entre si — assinatura de imagem girando, não de corpo torto.
 *
 * Abaixo disso o número continua aparecendo; o que sai é a afirmação de LADO,
 * que é onde a precisão que não temos vira uma certeza que o laudo não pode
 * dar.
 */
export const RESOLUCAO_ANGULAR_GRAUS = 1.5;

export interface CampoMedido {
  campo: keyof MedidasGeometricas;
  rotulo: string;
  unidade: string;
  /** Medidas com lado: o sinal vira palavra e o número perde o sinal. */
  lados?: [string, string];
  /** O ângulo que diz se este desnível é resolvível pelo método. */
  anguloPar?: keyof MedidasGeometricas;
}

export const MEDIDAS_DO_SCAN: CampoMedido[] = [
  {
    campo: "shoulder_drop_cm",
    rotulo: "Desnível dos ombros",
    unidade: "cm",
    lados: ["direito mais alto", "esquerdo mais alto"],
    anguloPar: "shoulder_tilt_deg",
  },
  { campo: "shoulder_tilt_deg", rotulo: "Inclinação dos ombros", unidade: "°" },
  {
    campo: "hip_drop_cm",
    rotulo: "Desnível do quadril",
    unidade: "cm",
    lados: ["direito mais alto", "esquerdo mais alto"],
    anguloPar: "hip_tilt_deg",
  },
  { campo: "hip_tilt_deg", rotulo: "Inclinação do quadril", unidade: "°" },
  { campo: "axis_deviation_cm", rotulo: "Desvio do eixo cabeça-tornozelos", unidade: "cm" },
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
  /** Null quando não há lado, ou quando a medida não resolve qual é. */
  lado: string | null;
  /** Por que o lado não foi afirmado. Null quando ele foi. */
  nota: string | null;
}

/** O desnível é grande o bastante para o método saber de que lado ele cai? */
function ladoResolvivel(medidas: MedidasGeometricas, medida: CampoMedido): boolean {
  if (!medida.anguloPar) return true;

  const angulo = medidas[medida.anguloPar];

  return typeof angulo === "number" && Math.abs(angulo) >= RESOLUCAO_ANGULAR_GRAUS;
}

/** As linhas que têm valor. Campo não medido some, em vez de virar zero. */
export function linhasMedidas(medidas: MedidasGeometricas): LinhaMedida[] {
  return MEDIDAS_DO_SCAN.flatMap((medida) => {
    const bruto = medidas[medida.campo];
    if (typeof bruto !== "number") return [];

    const resolvido = medida.lados && ladoResolvivel(medidas, medida);

    return [
      {
        campo: medida.campo,
        rotulo: medida.rotulo,
        valor: Math.abs(bruto),
        unidade: medida.unidade,
        lado: resolvido && medida.lados ? (bruto > 0 ? medida.lados[0] : medida.lados[1]) : null,
        nota: medida.lados && !resolvido ? "sem desnível que o método resolva" : null,
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
export function ressalvasDoScan(scan: MedidasDoAparelho): string[] {
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
