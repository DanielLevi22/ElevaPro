import { LIMIARES_PADRAO, type Limiares } from "./agachamento";
import { fatosDeLandmarks, type LandmarkNormalizado } from "./fatos";

/**
 * Por que uma gravação não rendeu repetição.
 *
 * "Nenhuma repetição detectada" é verdade e é inútil: não diz o que fazer
 * diferente na próxima gravação. Quem filmou de frente e quem filmou com os pés
 * fora do quadro recebem a mesma frase e nenhuma pista de qual dos dois erros
 * cometeu.
 *
 * Contar os quadros por motivo transforma o aviso em instrução.
 */

export interface Diagnostico {
  quadros: number;
  /** Faltou quadril, joelho ou tornozelo no quadro, ou a visibilidade era baixa. */
  semArticulacao: number;
  /** A pessoa estava de frente ou de costas, não de lado. */
  deFrente: number;
  /** Quadros que o julgador conseguiu ler. */
  aptos: number;
}

/** O motivo dominante, ou `null` quando a gravação estava legível. */
export type MotivoDominante = "sem-articulacao" | "de-frente" | null;

export function diagnosticar(
  quadros: LandmarkNormalizado[][],
  limiares: Limiares = LIMIARES_PADRAO,
): Diagnostico {
  const diagnostico: Diagnostico = {
    quadros: quadros.length,
    semArticulacao: 0,
    deFrente: 0,
    aptos: 0,
  };

  for (const pontos of quadros) {
    const fatos = fatosDeLandmarks(pontos);

    // A ordem espelha a do julgador: sem as articulações não há o que julgar, e
    // aí a orientação nem chega a ser perguntada. Contar os dois motivos no
    // mesmo quadro inflaria o total e a soma deixaria de fechar.
    if (
      fatos.quadril === null ||
      fatos.joelho === null ||
      fatos.tornozelo === null ||
      fatos.visibilidadeMinima < limiares.visibilidadeMinima
    ) {
      diagnostico.semArticulacao += 1;
      continue;
    }

    if (fatos.dePerfil === false) {
      diagnostico.deFrente += 1;
      continue;
    }

    diagnostico.aptos += 1;
  }

  return diagnostico;
}

/**
 * O motivo que mais pesou, quando ele é grande o bastante para valer a menção.
 *
 * Só aponta um motivo se ele cobrir a maioria dos quadros: numa gravação em que
 * um terço saiu de frente e o resto estava bom, o problema não é a orientação —
 * é outra coisa, e culpar a orientação mandaria a pessoa refazer o que já
 * estava certo.
 */
export function motivoDominante(diagnostico: Diagnostico): MotivoDominante {
  if (diagnostico.quadros === 0) return null;

  const maioria = diagnostico.quadros / 2;

  if (diagnostico.semArticulacao > maioria) return "sem-articulacao";
  if (diagnostico.deFrente > maioria) return "de-frente";

  return null;
}
