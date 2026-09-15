import type { ReactNode, RefObject } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';
import { AlvoDoVidro } from './AlvoDoVidro';
import { BRILHO_DA_NUTRICAO, BrilhoAmbiente, type ReceitaDoBrilho } from './BrilhoAmbiente';
import { ScreenLayout } from './ScreenLayout';

/**
 * A tela de vidro sem foto do kit: fundo liso, a luz da primária no topo e o
 * conteúdo rolando por cima, dentro do alvo do blur.
 *
 * Nasceu na nutrição e o cardio desenha a mesma tela, só com outra luz: por isso
 * mora aqui, e cada fluxo passa a sua receita. Não é a `TelaDeVidroComFoto`,
 * que tem foto de fundo e a luz atrás dos blocos de métrica.
 *
 * @example
 * <GlassScreen glow={CARDIO_GLOW} bottomSpace="actionBar" overlay={<BarraDeDuasAcoes … />}>…</GlassScreen>
 */
interface GlassScreenProps {
  children: ReactNode;
  /** A luz do fluxo. Sem ela, a da nutrição. */
  glow?: ReceitaDoBrilho;
  /** O que flutua fixo sobre a rolagem: o botão do assistente, a barra de ações. */
  overlay?: ReactNode;
  /**
   * Espaço no fim da rolagem para o último cartão não ficar atrás do rodapé: a
   * tab bar sozinha (110 no kit), ou a barra de duas ações acima dela (150, mais
   * os 22 que a barra sobe pelo "+" central).
   */
  bottomSpace?: 'tab' | 'actionBar';
  /** Sem ele, a rolagem não tem puxar-para-atualizar. */
  refresh?: { refreshing: boolean; onRefresh: () => void };
  /** Sem o respiro de cima: a tela abre com imagem colada no topo. */
  flushTop?: boolean;
  /** A conversa do assistente desce sozinha a cada mensagem, e precisa da rolagem. */
  scrollRef?: RefObject<ScrollView | null>;
}

const BOTTOM_SPACE = { tab: 'pb-[7.625rem]', actionBar: 'pb-[11.5rem]' } as const;

export function GlassScreen({
  children,
  glow = BRILHO_DA_NUTRICAO,
  overlay,
  bottomSpace = 'tab',
  refresh,
  flushTop = false,
  scrollRef,
}: GlassScreenProps) {
  const cores = useCores();

  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro fundo={<BrilhoAmbiente receita={glow} />}>
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={scrollRef ? () => scrollRef.current?.scrollToEnd() : undefined}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={cn(
            BOTTOM_SPACE[bottomSpace],
            flushTop ? null : 'px-[1.125rem] pt-[3.625rem]'
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refresh.refreshing}
                onRefresh={refresh.onRefresh}
                tintColor={cores.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {overlay}
      </AlvoDoVidro>
    </ScreenLayout>
  );
}

export type { GlassScreenProps };
