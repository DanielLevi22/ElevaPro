import { formatarDecimal } from '@elevapro/shared';

/**
 * A unidade de uma lista de cargas, decidida pelo maior valor dela.
 *
 * O `formatarVolume` do `shared` escolhe tonelada ou quilo valor a valor, e numa
 * lista isso põe "850 kg" ao lado de "1,2 t": a pessoa compara 850 com 1,2. Aqui a
 * lista inteira fala a mesma unidade.
 */
export type LoadUnit = 't' | 'kg';

const KILOS_PER_TONNE = 1000;

/**
 * Tonelada quando o maior valor da lista chega a uma, quilo quando não.
 *
 * @example loadUnit(11400) // "t"
 */
export function loadUnit(largest: number): LoadUnit {
  return largest >= KILOS_PER_TONNE ? 't' : 'kg';
}

/**
 * A carga na unidade da lista; sem a unidade quando o número vai ao lado de outro
 * que já a mostra.
 *
 * @example formatLoad(11400, "t") // "11,4 t"
 * @example formatLoad(1600, "t", false) // "1,6"
 */
export function formatLoad(kilograms: number, unit: LoadUnit, withUnit = true): string {
  const value =
    unit === 't' ? formatarDecimal(kilograms / KILOS_PER_TONNE) : String(Math.round(kilograms));
  return withUnit ? `${value} ${unit}` : value;
}
