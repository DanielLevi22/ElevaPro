import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * Ícone dentro de um quadrado tingido com a cor dele a 18%.
 *
 * O kit de vidro usa essa caixa no bloco de métrica e na linha de vidro, com
 * tamanhos diferentes e a mesma ideia: a cor identifica a grandeza, e o fundo é
 * a mesma cor rebaixada.
 *
 * O tom é nome, e não cor: no desenho isso é
 * `color-mix(in srgb, ${color} 18%, transparent)`, mas o Tailwind só gera
 * classe que aparece literal no fonte — `bg-${cor}/18` montado em runtime
 * produz classe que não existe no CSS. Então cada tom tem sua linha escrita.
 *
 * @example
 * <CaixaDeIcone icon="footsteps" tom="passos" tamanho="bloco" />
 */
export type TomDeMetrica =
  | 'passos'
  | 'calorias'
  | 'sono'
  | 'proteina'
  | 'carboidrato'
  | 'gordura'
  | 'marca';

interface CaixaDeIconeProps {
  icon: keyof typeof Ionicons.glyphMap;
  tom: TomDeMetrica;
  /** `bloco` é o quadrado de 32 do bloco de métrica; `linha`, o de 40. */
  tamanho?: 'bloco' | 'linha';
}

/** Classe literal por tom — ver a nota sobre `color-mix` acima. */
const FUNDO: Record<TomDeMetrica, string> = {
  passos: 'bg-metrica-passos/20',
  calorias: 'bg-metrica-calorias/20',
  sono: 'bg-metrica-sono/20',
  proteina: 'bg-metrica-proteina/20',
  carboidrato: 'bg-metrica-carboidrato/20',
  gordura: 'bg-metrica-gordura/20',
  marca: 'bg-primary/20',
};

const CAIXA = {
  bloco: 'h-[2rem] w-[2rem] rounded-[0.625rem]',
  linha: 'h-[2.5rem] w-[2.5rem] rounded-[0.8125rem]',
} as const;

const TAMANHO_DO_ICONE = { bloco: 16, linha: 19 } as const;

export function CaixaDeIcone({ icon, tom, tamanho = 'linha' }: CaixaDeIconeProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className={cn('shrink-0 items-center justify-center', CAIXA[tamanho], FUNDO[tom])}>
      <Ionicons
        name={icon}
        size={escalar(TAMANHO_DO_ICONE[tamanho])}
        color={corDoTom(tom, cores)}
      />
    </View>
  );
}

/** O ícone não aceita classe: precisa da cor já resolvida. */
export function corDoTom(tom: TomDeMetrica, cores: ReturnType<typeof useCores>): string {
  if (tom === 'marca') return cores.primary;
  if (tom === 'passos') return cores.metricaPassos;
  if (tom === 'calorias') return cores.metricaCalorias;
  if (tom === 'sono') return cores.metricaSono;
  if (tom === 'proteina') return cores.metricaProteina;
  if (tom === 'carboidrato') return cores.metricaCarboidrato;
  return cores.metricaGordura;
}
