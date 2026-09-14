import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';

/**
 * O lugar da foto do prato, com o ícone do tipo de refeição.
 *
 * O kit desenha um espaço listrado escrito "foto". O aluno não envia foto de
 * prato — ela saiu do banco na `0035` pela LGPD (`meal_logs.photo_url`) — e o
 * app não tem acervo de imagem de comida, então o espaço mostra o que se sabe
 * da refeição: a hora do dia dela.
 *
 * @example
 * <IconeDaRefeicao nome="Almoço" tamanho="linha" />
 */
interface IconeDaRefeicaoProps {
  /** O nome ou o `meal_type` da refeição. */
  nome: string;
  /** `linha` é o 52×46 da lista do plano; `troca`, o 46×42 dos equivalentes. */
  tamanho?: 'linha' | 'troca' | 'atual';
}

const CAIXA = {
  linha: 'h-[2.875rem] w-[3.25rem] rounded-[0.8125rem]',
  troca: 'h-[2.625rem] w-[2.875rem] rounded-[0.75rem]',
  atual: 'h-12 w-[3.375rem] rounded-[0.8125rem]',
} as const;

const TAMANHO_DO_ICONE = { linha: 20, troca: 18, atual: 21 } as const;

type NomeDoIcone = keyof typeof Ionicons.glyphMap;

/** Da palavra no nome ao ícone. A primeira que casar vale. */
const ICONES: [RegExp, NomeDoIcone][] = [
  [/caf[eé]|desjejum|manh[aã]/i, 'cafe-outline'],
  [/lanche|ceia|merenda/i, 'nutrition-outline'],
  [/almo[cç]o/i, 'restaurant-outline'],
  [/jantar|noite/i, 'moon-outline'],
  [/pr[eé]|p[oó]s|treino/i, 'barbell-outline'],
];

export function iconeDaRefeicao(nome: string): NomeDoIcone {
  return ICONES.find(([padrao]) => padrao.test(nome))?.[1] ?? 'restaurant-outline';
}

export function IconeDaRefeicao({ nome, tamanho = 'linha' }: IconeDaRefeicaoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className={cn('shrink-0 items-center justify-center bg-glass-strong', CAIXA[tamanho])}>
      <Ionicons
        name={iconeDaRefeicao(nome)}
        size={escalar(TAMANHO_DO_ICONE[tamanho])}
        color={cores.mutedForeground}
      />
    </View>
  );
}
