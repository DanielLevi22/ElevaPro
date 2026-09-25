import type { ImageSourcePropType } from 'react-native';

/** Imagem de capa por grupo muscular, usada nos cartões de treino da fase. */
export const MUSCLE_IMAGES: Record<string, ImageSourcePropType> = {
  Peito: require('../../../../assets/workouts/chest.jpg'),
  Costas: require('../../../../assets/workouts/back.jpg'),
  Pernas: require('../../../../assets/workouts/legs.jpg'),
  Braços: require('../../../../assets/workouts/arms.jpg'),
  Ombros: require('../../../../assets/workouts/shoulders.jpg'),
  Abdominais: require('../../../../assets/workouts/abs.jpg'),
  Geral: require('../../../../assets/workouts/back.jpg'),
};
