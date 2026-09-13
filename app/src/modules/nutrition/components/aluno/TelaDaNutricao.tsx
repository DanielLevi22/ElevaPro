import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { AlvoDoVidro } from '@/components/ui/AlvoDoVidro';
import { BRILHO_DA_NUTRICAO, BrilhoAmbiente } from '@/components/ui/BrilhoAmbiente';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';

/**
 * A tela do fluxo de nutrição do kit: fundo liso, a luz da primária no topo e
 * o conteúdo rolando por cima, dentro do alvo do blur.
 *
 * Não é a `TelaDeVidroComFoto`: o kit de nutrição não tem foto de fundo, e a
 * luz dele fica no topo (`top:-60px`), e não atrás de blocos de métrica.
 *
 * @example
 * <TelaDaNutricao folgaNoFim="rodape" sobreposicao={<BarraDeDuasAcoes … />}>…</TelaDaNutricao>
 */
interface TelaDaNutricaoProps {
  children: ReactNode;
  /** O que flutua fixo sobre a rolagem: o botão do assistente, a barra de ações. */
  sobreposicao?: ReactNode;
  /**
   * Espaço no fim da rolagem para o último cartão não ficar atrás do rodapé: a
   * tab bar sozinha (110 no kit), ou a barra de duas ações acima dela (150).
   */
  folgaNoFim?: 'tab' | 'rodape';
  /** Sem ele, a rolagem não tem puxar-para-atualizar. */
  recarregar?: { carregando: boolean; onRecarregar: () => void };
  /** Sem o respiro de cima: a tela abre com imagem colada no topo. */
  semRespiroNoTopo?: boolean;
}

const FOLGA = { tab: 'pb-[7.625rem]', rodape: 'pb-[10.125rem]' } as const;

export function TelaDaNutricao({
  children,
  sobreposicao,
  folgaNoFim = 'tab',
  recarregar,
  semRespiroNoTopo = false,
}: TelaDaNutricaoProps) {
  const cores = useCores();

  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro fundo={<BrilhoAmbiente receita={BRILHO_DA_NUTRICAO} />}>
        <ScrollView
          contentContainerClassName={cn(
            FOLGA[folgaNoFim],
            semRespiroNoTopo ? null : 'px-[1.125rem] pt-[3.625rem]'
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            recarregar ? (
              <RefreshControl
                refreshing={recarregar.carregando}
                onRefresh={recarregar.onRecarregar}
                tintColor={cores.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {sobreposicao}
      </AlvoDoVidro>
    </ScreenLayout>
  );
}
