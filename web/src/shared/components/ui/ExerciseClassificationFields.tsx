"use client";

import {
  EXERCISE_CATEGORIES,
  EXERCISE_MUSCLE_GROUPS,
  EXERCISE_VENUES,
  type ExerciseCategory,
  type ExerciseMuscleGroup,
  type ExerciseVenue,
} from "@elevapro/shared";

/**
 * As três classificações de um exercício, num lugar só.
 *
 * Existe porque o campo de grupo muscular era texto livre com placeholder
 * "ex: Peito": quem cadastrava gravava `Peito`, e a busca do coach procurava
 * `peito` e não achava — o catálogo cheio respondia zero. Vocabulário fechado
 * só fecha se a tela oferecer a mesma lista que o banco aceita.
 *
 * @example
 * <ExerciseClassificationFields
 *   values={{ muscle_group, venue, category }}
 *   onChange={(campo, valor) => setFormData({ ...formData, [campo]: valor })}
 * />
 */

/** Rótulo humano para o valor que o banco guarda. */
const MUSCLE_GROUP_LABELS: Record<ExerciseMuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombro: "Ombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  pernas: "Pernas",
  gluteos: "Glúteos",
  abdomen: "Abdômen",
  cardio: "Cardio",
};

const VENUE_LABELS: Record<ExerciseVenue, string> = {
  academia: "Só na academia",
  casa: "Dá para fazer em casa",
  ambos: "Serve nos dois",
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  forca: "Força",
  cardio: "Cardio",
  alongamento: "Alongamento",
  mobilidade: "Mobilidade",
  postural: "Postural",
  estabilizacao: "Estabilização",
};

const SELECT_CLASS =
  "w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export interface ExerciseClassification {
  muscle_group: string;
  venue: string;
  category: string;
}

interface Props {
  values: ExerciseClassification;
  onChange: (campo: keyof ExerciseClassification, valor: string) => void;
}

export function ExerciseClassificationFields({ values, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="muscle_group" className="block text-sm font-medium text-foreground mb-1">
          Grupo muscular
        </label>
        <select
          id="muscle_group"
          required
          value={values.muscle_group}
          onChange={(e) => onChange("muscle_group", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Selecione…</option>
          {EXERCISE_MUSCLE_GROUPS.map((grupo) => (
            <option key={grupo} value={grupo}>
              {MUSCLE_GROUP_LABELS[grupo]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="venue" className="block text-sm font-medium text-foreground mb-1">
          Onde dá para fazer
        </label>
        <select
          id="venue"
          value={values.venue}
          onChange={(e) => onChange("venue", e.target.value)}
          className={SELECT_CLASS}
        >
          {EXERCISE_VENUES.map((lugar) => (
            <option key={lugar} value={lugar}>
              {VENUE_LABELS[lugar]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-foreground mb-1">
          Tipo de trabalho
        </label>
        <select
          id="category"
          value={values.category}
          onChange={(e) => onChange("category", e.target.value)}
          className={SELECT_CLASS}
        >
          {EXERCISE_CATEGORIES.map((tipo) => (
            <option key={tipo} value={tipo}>
              {CATEGORY_LABELS[tipo]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
