import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { BotaoRedondo } from './BotaoRedondo';

/**
 * Voltar, sobrelinha e título sobre a foto — o `HeroHeader` do kit.
 *
 * O fluxo de treino abre quase toda tela com ele. A sobrelinha diz onde o aluno
 * está ("Fase 2 · Hipertrofia"); o título, o que a tela é.
 *
 * @example
 * <CabecalhoSobreFoto sobrelinha="Periodização" titulo="Hipertrofia 2026" onVoltar={router.back} />
 */
interface CabecalhoSobreFotoProps {
  sobrelinha: string;
  titulo: string;
  /** Sem ele não há botão: a tela de entrada de uma aba não tem para onde voltar. */
  onVoltar?: () => void;
  /** O botão da direita, quando a tela tem ação. */
  direita?: ReactNode;
}

export function CabecalhoSobreFoto({
  sobrelinha,
  titulo,
  onVoltar,
  direita,
}: CabecalhoSobreFotoProps) {
  return (
    <View className="flex-row items-center gap-3">
      {onVoltar ? <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={onVoltar} /> : null}
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-micro font-bold uppercase tracking-wide text-hero-secondary"
        >
          {sobrelinha}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[1.375rem] font-bold tracking-tight text-hero"
        >
          {titulo}
        </Text>
      </View>
      {direita}
    </View>
  );
}

export type { CabecalhoSobreFotoProps };
