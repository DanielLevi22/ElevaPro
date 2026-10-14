import type { BlockComparison } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BeforeAfterRow } from '@/components/ui/BeforeAfterRow';
import { FlowFrame, FlowTitle } from '@/components/ui/FlowFrame';
import { InfoNote } from '@/components/ui/InfoNote';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { mensagemDeErroBff } from '@/shared/bff';
import { useNextBlockActions } from '../hooks/useBlockReview';
import { comparisonRows, keptNote } from '../services/comparisonCopy';
import { useReviewStore } from '../store/reviewStore';

/**
 * B5 · O próximo bloco, para aprovar: o que muda e o que continua. Só "Aprovar"
 * grava (ADR-0020); "Ajustar" volta à reavaliação, e até aprovar o bloco atual
 * segue valendo.
 *
 * @example <NextBlockScreen />
 */
export function NextBlockScreen() {
  const router = useRouter();
  const pending = useReviewStore((state) => state.pending);
  const reset = useReviewStore((state) => state.reset);
  const { approve } = useNextBlockActions();

  async function approveBlock() {
    try {
      await approve.mutateAsync();
      reset();
      router.replace(ROUTES.TABS.ROOT);
      showAlert({
        title: 'Bloco aprovado',
        message: 'Seu novo bloco começa hoje.',
        type: 'success',
      });
    } catch (error) {
      registrarFalha('block.approve_next');
      showAlert({ title: 'Não aprovado', message: mensagemDeErroBff(error), type: 'error' });
    }
  }

  if (!pending) {
    return (
      <FlowFrame
        header={{}}
        primary={{ label: 'Voltar ao início', onPress: () => router.replace(ROUTES.TABS.ROOT) }}
      >
        <FlowTitle sub="Comece a reavaliação de novo pela tela inicial.">
          Nenhum bloco esperando
        </FlowTitle>
      </FlowFrame>
    );
  }
  return (
    <FlowFrame
      header={{}}
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{
            rotulo: 'Ajustar',
            icone: 'options-outline',
            onPress: () => router.replace(ROUTES.BLOCK.CHANGES),
            desabilitada: approve.isPending,
          }}
          principal={{
            rotulo: `Aprovar Bloco ${pending.blockNumber}`,
            icone: 'checkmark',
            onPress: () => void approveBlock(),
            desabilitada: approve.isPending,
          }}
        />
      }
    >
      <FlowTitle
        eyebrow={`Bloco ${pending.blockNumber} · 4 semanas`}
        sub="Começa hoje, das cargas que você já levanta."
      >
        Seu próximo bloco
      </FlowTitle>
      <TituloDeSecao estilo="rotulo">O que muda</TituloDeSecao>
      <Comparison comparison={pending.comparison} />
      <InfoNote icon="lock-closed-outline" className="mt-3">
        {keptNote(pending.comparison)}
      </InfoNote>
    </FlowFrame>
  );
}

function Comparison({ comparison }: { comparison: BlockComparison }) {
  return (
    <Vidro className="px-3.5">
      <View>
        {comparisonRows(comparison).map((row, index) => (
          <BeforeAfterRow key={row.title} first={index === 0} {...row} />
        ))}
      </View>
    </Vidro>
  );
}
