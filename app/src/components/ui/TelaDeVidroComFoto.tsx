import type { ReactNode } from 'react';
import { type ImageSourcePropType, ScrollView } from 'react-native';
import { cn } from '@/lib/utils';
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
 * <TelaDeVidroComFoto imagem={fotoDoGrupo('Costas')}>…</TelaDeVidroComFoto>
 */
interface TelaDeVidroComFotoProps {
  imagem: ImageSourcePropType;
  children: ReactNode;
  /** O que flutua fixo sobre a rolagem, como o botão de ação do detalhe. */
  sobreposicao?: ReactNode;
  /**
   * Espaço no fim da rolagem, para o último cartão não ficar atrás do que
   * flutua no rodapé: a tab bar, ou a tab bar e o botão fixo acima dela.
   */
  folgaNoFim?: 'tab' | 'botaoFixo';
  /** Conteúdo no meio da altura, como o pré-início do treino. */
  centralizado?: boolean;
}

/** O kit: 120 de respiro sob a tab bar; 150 quando o botão fixo está por cima dela. */
const FOLGA = { tab: 'px-4 pb-[7.5rem] pt-14', botaoFixo: 'px-4 pb-[9.375rem] pt-14' } as const;

export function TelaDeVidroComFoto({
  imagem,
  children,
  sobreposicao,
  folgaNoFim = 'tab',
  centralizado = false,
}: TelaDeVidroComFotoProps) {
  return (
    <ScreenLayout useSafeArea={false}>
      <AlvoDoVidro
        fundo={
          <>
            <FundoDeFoto imagem={imagem} receita={RECEITA_DA_HOME} />
            <BrilhoAmbiente />
          </>
        }
      >
        <ScrollView
          contentContainerClassName={cn(
            FOLGA[folgaNoFim],
            centralizado ? 'flex-grow justify-center' : null
          )}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {sobreposicao}
      </AlvoDoVidro>
    </ScreenLayout>
  );
}

export type { TelaDeVidroComFotoProps };
