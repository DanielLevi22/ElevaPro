import type { ReactNode } from 'react';
import { type ImageSourcePropType, RefreshControl, ScrollView } from 'react-native';
import { cn } from '@/lib/utils';
import { useBottomOffset, useCores } from '@/shared/design';
import { AlvoDoVidro } from './AlvoDoVidro';
import { BrilhoAmbiente } from './BrilhoAmbiente';
import { FundoDeFoto, RECEITA_DA_HOME } from './FundoDeFoto';
import { ScreenLayout } from './ScreenLayout';

/**
 * A tela de vidro do kit: foto no topo, luz da primária, conteúdo rolando por
 * cima — e o alvo do blur em volta de tudo.
 *
 * As três telas do fluxo de treino repetiam as mesmas cinco camadas na mesma
 * ordem, e a ordem importa: o fundo tem de estar dentro do alvo e o conteúdo
 * fora dele, ou o vidro não desfoca no Android (ver `AlvoDoVidro`). Em um
 * componente, a ordem certa é a única possível.
 *
 * A tela inicial não usa este: a luz dela se ancora nos blocos de métrica e a
 * rolagem tem puxar-para-atualizar.
 *
 * @example
 * <TelaDeVidroComFoto image={fotoDoGrupo('Costas')}>…</TelaDeVidroComFoto>
 */
interface TelaDeVidroComFotoProps {
  image: ImageSourcePropType;
  children: ReactNode;
  /** O que flutua fixo sobre a rolagem, como o botão de ação do detalhe. */
  overlay?: ReactNode;
  /**
   * Espaço no fim da rolagem, para o último cartão não ficar atrás do que
   * flutua no rodapé: a tab bar, ou a tab bar e o botão fixo acima dela.
   */
  bottomSpace?: 'tab' | 'fixedButton';
  /** Conteúdo no meio da altura, como o pré-início do treino. */
  centered?: boolean;
  /** Puxar para atualizar, no formato da `GlassScreen`: o placar do ranking (#320). */
  refresh?: { refreshing: boolean; onRefresh: () => void };
}

/**
 * O kit: 120 de respiro sob a tab bar; 150 quando o botão fixo está por cima
 * dela, mais os 22 que o botão subiu para não encostar no "+" central. Medido
 * do fundo da tela, com a faixa do sistema do aparelho (`useBottomOffset`).
 */
const BOTTOM_SPACE = { tab: 120, fixedButton: 172 } as const;

export function TelaDeVidroComFoto({
  image,
  children,
  overlay,
  bottomSpace = 'tab',
  centered = false,
  refresh,
}: TelaDeVidroComFotoProps) {
  const colors = useCores();
  const fimDaRolagem = useBottomOffset(BOTTOM_SPACE[bottomSpace]);

  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro
        fundo={
          <>
            <FundoDeFoto imagem={image} receita={RECEITA_DA_HOME} />
            <BrilhoAmbiente />
          </>
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={cn('px-4 pt-14', centered ? 'flex-grow justify-center' : null)}
          contentContainerStyle={{ paddingBottom: fimDaRolagem }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refresh.refreshing}
                onRefresh={refresh.onRefresh}
                tintColor={colors.primary}
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

export type { TelaDeVidroComFotoProps };
