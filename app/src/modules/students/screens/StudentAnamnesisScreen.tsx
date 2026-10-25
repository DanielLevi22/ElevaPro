import { GENERAL_ANAMNESIS } from '@elevapro/shared/data/anamnesisQuestions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { type StudentAnamnesisStatus, useStudentAnamnesis } from '../hooks/useStudentAnamnesis';
import { type AnsweredQuestion, answeredSections } from '../services/anamnesisAnswers';
import { useStudentStore } from '../store/studentStore';

/**
 * A anamnese do aluno, só leitura — o "Anamnese" do Gerenciamento no Acompanhamento.
 *
 * Mesma foto e cabeçalho do Acompanhamento: é a tela seguinte da mesma pilha, e
 * trocar de cenário faria parecer outro fluxo.
 */
export default function StudentAnamnesisScreen() {
  const router = useRouter();
  const { studentId: param } = useLocalSearchParams();
  const studentId = (Array.isArray(param) ? param[0] : param) ?? '';
  const student = useStudentStore((state) => state.students.find((s) => s.id === studentId));
  const { responses, status } = useStudentAnamnesis(studentId);

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('arms')}>
      <CabecalhoSobreFoto
        sobrelinha={student?.full_name ?? student?.email ?? 'Aluno'}
        titulo="Anamnese"
        onVoltar={router.back}
      />
      {status === 'ready' ? (
        answeredSections(GENERAL_ANAMNESIS, responses).map((section) => (
          <View key={section.id}>
            <TituloDeSecao estilo="rotulo">{section.title}</TituloDeSecao>
            <Vidro>
              {section.questions.map((question, i) => (
                <AnswerRow
                  key={question.id}
                  item={question}
                  last={i === section.questions.length - 1}
                />
              ))}
            </Vidro>
          </View>
        ))
      ) : (
        <StatusBody status={status} />
      )}
    </TelaDeVidroComFoto>
  );
}

function AnswerRow({ item, last }: { item: AnsweredQuestion; last: boolean }) {
  return (
    <View className={cn('px-3.5 py-3', !last && 'border-b-[0.5px] border-glass-border')}>
      <Text className="text-legenda text-muted-foreground">{item.question}</Text>
      <Text
        className={cn(
          'mt-0.5 text-rotulo font-semibold tracking-tight',
          item.answer ? 'text-foreground' : 'text-placeholder'
        )}
      >
        {item.answer ?? 'Não respondido'}
      </Text>
    </View>
  );
}

const STATUS_MESSAGE: Record<Exclude<StudentAnamnesisStatus, 'loading' | 'ready'>, string> = {
  failed: 'Não foi possível carregar a anamnese.',
  empty: 'O aluno ainda não respondeu a anamnese.',
};

function StatusBody({ status }: { status: Exclude<StudentAnamnesisStatus, 'ready'> }) {
  const cores = useCores();
  if (status === 'loading') return <ActivityIndicator color={cores.primary} className="py-10" />;
  return (
    <Text className="py-10 text-center text-legenda text-muted-foreground">
      {STATUS_MESSAGE[status]}
    </Text>
  );
}
