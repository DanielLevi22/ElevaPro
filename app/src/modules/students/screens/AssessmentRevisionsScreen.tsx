import {
  ASSESSMENT_FIELD_LABELS,
  type AssessmentRevision,
  dataCurtaDoInstante,
  formatarDecimal,
} from '@elevapro/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { InfoNote } from '@/components/ui/InfoNote';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { Vidro } from '@/components/ui/Vidro';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { assessmentClient } from '../services/assessmentClient';

type Load =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; revisions: AssessmentRevision[] };

/**
 * As versões anteriores de uma avaliação corrigida (#385).
 *
 * Lidas ao abrir e descartadas ao sair, sem store: o acervo retificado é o dado
 * de saúde que menos gente precisa ver, e não fica em memória além da tela.
 */
export default function AssessmentRevisionsScreen() {
  const router = useRouter();
  const { id, assessmentId } = useLocalSearchParams<{ id: string; assessmentId: string }>();
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  const fetchRevisions = useCallback(() => {
    let active = true;
    setLoad({ status: 'loading' });
    assessmentClient
      .revisions(id, assessmentId)
      .then((revisions) => active && setLoad({ status: 'ready', revisions }))
      .catch((error: Error) => active && setLoad({ status: 'failed', message: error.message }));
    return () => {
      active = false;
    };
  }, [id, assessmentId]);

  useEffect(fetchRevisions, [fetchRevisions]);

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')}>
      <CabecalhoSobreFoto
        sobrelinha="Avaliação física"
        titulo="Histórico de correções"
        onVoltar={router.back}
      />
      <InfoNote icon="information-circle-outline" className="mt-4 mb-2.5">
        Estas versões foram retificadas e não entram nos gráficos nem nas comparações.
      </InfoNote>
      <RevisionsBody load={load} onRetry={fetchRevisions} />
    </TelaDeVidroComFoto>
  );
}

function RevisionsBody({ load, onRetry }: { load: Load; onRetry: () => void }) {
  const cores = useCores();
  if (load.status === 'loading') {
    return <ActivityIndicator color={cores.primary} className="py-10" />;
  }
  if (load.status === 'failed') {
    return (
      <View className="items-center py-8">
        <Text className="mb-4 text-center text-legenda text-muted-foreground">{load.message}</Text>
        <ActionPill icon="refresh-outline" label="Tentar novamente" onPress={onRetry} />
      </View>
    );
  }
  if (load.revisions.length === 0) {
    return (
      <Text className="py-8 text-center text-legenda text-muted-foreground">
        Nenhuma correção registrada.
      </Text>
    );
  }
  return load.revisions.map((revision) => <RevisionCard key={revision.id} revision={revision} />);
}

function RevisionCard({ revision }: { revision: AssessmentRevision }) {
  const values = revision.previous_values;
  return (
    <Vidro classeExterna="mb-2.5" className="p-3.5">
      <Text className="text-rotulo font-semibold text-foreground">
        {`Versão retificada em ${instantLabel(revision.corrected_at)}`}
      </Text>
      <View className="mt-3 flex-row flex-wrap">
        {ASSESSMENT_FIELD_LABELS.filter(({ key }) => values[key] !== null).map(
          ({ key, label, unit }) => (
            <View key={key} className="mb-3 w-1/2">
              <Text className="text-legenda text-muted-foreground">{label}</Text>
              <Text className="mt-0.5 text-rotulo font-semibold text-foreground">
                {`${formatarDecimal(Number(values[key]))} ${unit}`}
              </Text>
            </View>
          )
        )}
      </View>
      {values.notes ? (
        <Text className="text-legenda text-muted-foreground">{values.notes}</Text>
      ) : null}
    </Vidro>
  );
}

/** "06 mai 2026, 14:05", no fuso do aparelho. */
function instantLabel(iso: string): string {
  const date = new Date(iso);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${dataCurtaDoInstante(iso)} ${date.getFullYear()}, ${time}`;
}
