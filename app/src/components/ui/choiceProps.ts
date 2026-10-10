/**
 * O que toda escolha do kit recebe: o texto, se está marcada e o toque.
 * `ChipMulti`, `ChipPick` e `ChoiceTile` mudam só o desenho.
 */
export interface ChoiceProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}
