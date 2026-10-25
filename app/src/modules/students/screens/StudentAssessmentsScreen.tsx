import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ActionPill } from '../components/ActionPill';
import { AssessmentCard } from '../components/AssessmentCard';
import { useAssessmentActions } from '../hooks/useAssessmentActions';
import { useLinkedStudent } from '../hooks/useLinkedStudent';
import { useAssessmentsStore } from '../store/assessmentsStore';

/**
 * As avaliações físicas do aluno, a mesma tela do web: a série que o especialista
 * mediu, com nova avaliação, correção e o histórico de correções.
 *
 * Só a série profissional (ADR-0030): a medida que o aluno declarou mora no
 * Progresso dele, e as duas nunca se comparam.
 */
export default function StudentAssessmentsScreen() {
  const router = useRouter();
  const { studentId, student } = useLinkedStudent();
  const { assessments, status, load } = useAssessmentsStore();
  const { canCreate, actionsFor } = useAssessmentActions(studentId);
  const openForm = (assessmentId?: string) =>
    router.navigate(ROUTES.STUDENTS.ASSESSMENTS.FORM(studentId, assessmentId));

  useEffect(() => {
    if (studentId) load(studentId);
  }, [studentId, load]);

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')}>
      <CabecalhoSobreFoto
        sobrelinha={student?.full_name ?? student?.email ?? 'Aluno'}
        titulo="Avaliações"
        onVoltar={router.back}
        direita={
          canCreate && status === 'ready' && assessments.length > 0 ? (
            <BotaoRedondo icone="plus" rotulo="Nova avaliação" onPress={() => openForm()} />
          ) : undefined
        }
      />
      {status === 'ready' && assessments.length > 0 ? (
        <>
          <TituloDeSecao estilo="rotulo" acao={countLabel(assessments.length)}>
            Avaliações físicas
          </TituloDeSecao>
          {assessments.map((assessment, i) => {
            const actions = actionsFor(assessment);
            return (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                number={i + 1}
                previous={assessments[i + 1] ?? null}
                onCorrect={actions.canCorrect ? () => openForm(assessment.id) : undefined}
                onHistory={
                  actions.canSeeHistory
                    ? () =>
                        router.navigate(
                          ROUTES.STUDENTS.ASSESSMENTS.REVISIONS(studentId, assessment.id)
                        )
                    : undefined
                }
              />
            );
          })}
        </>
      ) : (
        <StatusBody
          status={status}
          onCreate={canCreate ? () => openForm() : undefined}
          onRetry={() => load(studentId)}
        />
      )}
    </TelaDeVidroComFoto>
  );
}

function countLabel(count: number): string {
  return count === 1 ? '1 avaliação' : `${count} avaliações`;
}

interface StatusBodyProps {
  status: 'loading' | 'failed' | 'ready';
  onCreate?: () => void;
  onRetry: () => void;
}

/** Carregando, falha ou série vazia — o vazio convida à primeira avaliação. */
function StatusBody({ status, onCreate, onRetry }: StatusBodyProps) {
  const cores = useCores();
  if (status === 'loading') return <ActivityIndicator color={cores.primary} className="py-10" />;
  if (status === 'failed') {
    return (
      <EmptyState message="Não foi possível carregar as avaliações.">
        <ActionPill icon="refresh-outline" label="Tentar novamente" onPress={onRetry} />
      </EmptyState>
    );
  }
  return (
    <EmptyState message="Sem avaliações. Registre a primeira avaliação física deste aluno.">
      {onCreate ? (
        <ActionPill icon="add-outline" label="Nova avaliação" onPress={onCreate} />
      ) : null}
    </EmptyState>
  );
}

function EmptyState({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <View className="items-center py-10">
      <Text className="mb-4 text-center text-legenda text-muted-foreground">{message}</Text>
      {children}
    </View>
  );
}
