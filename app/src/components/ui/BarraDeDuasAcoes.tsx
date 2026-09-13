import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';

/**
 * A barra fixa acima da tab bar com duas ações: a secundária em vidro, do
 * tamanho do texto, e a principal em lime ocupando o resto — "Ajustar" e
 * "Marcar como feita", "Cancelar" e "Confirmar troca".
 *
 * É o `.footerbar` do fluxo de nutrição do kit. Não é o `BotaoFixoNoRodape`,
 * que é uma ação só, mais alta e em letra maior.
 *
 * A secundária é o `glass-strong` do kit **sobre a cor da tela**, e não sozinho.
 * No kit o vidro forte a 11% flutua sobre o fundo vazio; aqui a lista rola por
 * baixo dele, e a rolagem fica fora do alvo do blur — o nome do alimento
 * atravessava o rótulo. Com a cor da tela embaixo o tom é o mesmo do kit, e
 * nada passa.
 *
 * O kit a põe a 96 do fundo do telefone: 34 da área do indicador de início,
 * que aqui é o `inset`, e 62 de tab bar e respiro. Mais 22 pelo "+" central
 * da tab bar, que o kit não desenha e que sobressai acima dela — o mesmo
 * acréscimo do `BotaoFixoNoRodape`.
 *
 * @example
 * <BarraDeDuasAcoes
 *   secundaria={{ rotulo: 'Cancelar', icone: 'close', onPress: router.back }}
 *   principal={{ rotulo: 'Confirmar troca', icone: 'checkmark', onPress: confirmar }} />
 */
interface Acao {
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  desabilitada?: boolean;
}

interface BarraDeDuasAcoesProps {
  secundaria: Acao;
  principal: Acao;
}

const ACIMA_DO_INSET = 84;
const TAMANHO_DO_ICONE = 15;
/** `0 10px 26px -10px` da primária a 80%. */
const BRILHO_DA_PRINCIPAL = { y: 10, blur: 26, espalhamento: -10 } as const;

export function BarraDeDuasAcoes({ secundaria, principal }: BarraDeDuasAcoesProps) {
  const escalar = useEscala();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute left-[1.125rem] right-[1.125rem] flex-row gap-[0.5625rem]"
      style={{ bottom: insets.bottom + escalar(ACIMA_DO_INSET) }}
    >
      <BotaoDaBarra acao={secundaria} tom="vidro" />
      <BotaoDaBarra acao={principal} tom="principal" />
    </View>
  );
}

function BotaoDaBarra({ acao, tom }: { acao: Acao; tom: 'vidro' | 'principal' }) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const principal = tom === 'principal';

  return (
    <TouchableOpacity
      onPress={acao.onPress}
      disabled={acao.desabilitada}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={acao.rotulo}
      accessibilityState={{ disabled: acao.desabilitada }}
      className={cn(
        'h-[2.625rem] flex-row items-center justify-center gap-[0.4375rem] rounded-[0.8125rem]',
        principal
          ? 'flex-1 bg-primary'
          : 'overflow-hidden border border-glass-border bg-background px-4',
        acao.desabilitada ? 'opacity-50' : null
      )}
      style={principal ? { boxShadow: brilho(BRILHO_DA_PRINCIPAL, { alfa: 0.8 }) } : undefined}
    >
      {principal ? null : <View className="absolute inset-0 bg-glass-strong" />}
      <Ionicons
        name={acao.icone}
        size={escalar(TAMANHO_DO_ICONE)}
        color={principal ? cores.primaryForeground : cores.foreground}
      />
      <Text
        numberOfLines={1}
        className={
          principal
            ? 'text-[0.71875rem] font-extrabold uppercase tracking-wide text-primary-foreground'
            : 'text-[0.71875rem] font-extrabold uppercase tracking-wide text-foreground'
        }
      >
        {acao.rotulo}
      </Text>
    </TouchableOpacity>
  );
}

export type { BarraDeDuasAcoesProps };
