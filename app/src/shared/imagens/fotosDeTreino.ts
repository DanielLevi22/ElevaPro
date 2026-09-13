import type { ImageSourcePropType } from 'react-native';

/**
 * A foto de cada grupo muscular e de cada objetivo de ciclo.
 *
 * O mapa estava copiado em sete arquivos, cada cópia com um conjunto de chaves:
 * uma aceitava "Abs", outra "Abdominais", outra os nomes em inglês, e um treino
 * de abdômen mostrava foto de peito ou de costas conforme a tela que o abria.
 * As telas novas usam só este; as cópias que restam nas telas antigas do
 * especialista saem quando elas forem reescritas.
 *
 * @example
 * <FundoDeFoto imagem={fotoDoGrupo(treino.muscle_group)} … />
 */
const PEITO = require('../../../assets/workouts/chest.jpg');
const COSTAS = require('../../../assets/workouts/back.jpg');
const PERNAS = require('../../../assets/workouts/legs.jpg');
const BRACOS = require('../../../assets/workouts/arms.jpg');
const OMBROS = require('../../../assets/workouts/shoulders.jpg');
const ABDOMEN = require('../../../assets/workouts/abs.jpg');

const POR_GRUPO: Record<string, ImageSourcePropType> = {
  peito: PEITO,
  chest: PEITO,
  costas: COSTAS,
  back: COSTAS,
  pernas: PERNAS,
  legs: PERNAS,
  braços: BRACOS,
  bracos: BRACOS,
  arms: BRACOS,
  ombros: OMBROS,
  shoulders: OMBROS,
  abdominais: ABDOMEN,
  abdomen: ABDOMEN,
  abs: ABDOMEN,
};

/** Grupo desconhecido ou vazio cai em costas, a foto neutra do kit. */
export function fotoDoGrupo(grupo: string | null | undefined): ImageSourcePropType {
  return POR_GRUPO[(grupo ?? '').trim().toLowerCase()] ?? COSTAS;
}

const POR_OBJETIVO: Record<string, ImageSourcePropType> = {
  strength: COSTAS,
  hypertrophy: PEITO,
  adaptation: BRACOS,
};

/** A foto do ciclo pelo objetivo dele; sem objetivo, pernas, como o kit. */
export function fotoDoObjetivo(objetivo: string | null | undefined): ImageSourcePropType {
  return POR_OBJETIVO[objetivo ?? ''] ?? PERNAS;
}
