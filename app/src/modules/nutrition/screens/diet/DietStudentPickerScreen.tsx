import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAuthStore } from '@/auth';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { GlassChoice } from '@/components/ui/GlassChoice';
import { GlassSearchField } from '@/components/ui/GlassSearchField';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { DietListFeedback } from '../../components/diet/DietListFeedback';
import { ToggleChip } from '../../components/diet/ToggleChip';
import { type DietStudentChoice, fetchDietStudentChoices } from '../../services/dietStudentChoices';
import { useDietWizardStore } from '../../store/dietWizardStore';

/** Escolha do destinatário dentro da criação, sem desviar para a aba Alunos. */
export default function DietStudentPickerScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const canCreate = useAuthStore(
    (s) => s.accountType === 'specialist' && !!s.abilities?.can('create', 'Diet')
  );
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const query = useQuery({
    queryKey: ['diet-student-choices', userId],
    queryFn: () => fetchDietStudentChoices(userId ?? ''),
    enabled: !!userId && canCreate,
    gcTime: 0,
  });
  const students = query.data?.filter((student) =>
    student.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))
  );

  function selectStudent(student: DietStudentChoice) {
    useDietWizardStore
      .getState()
      .startFor({ studentId: student.id, studentName: student.name, ownPlan: false });
    router.push({ pathname: ROUTES.NUTRITION.WIZARD_START, params: { studentId: student.id } });
  }

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('legs')}>
      <CabecalhoSobreFoto
        sobrelinha="Nova dieta"
        titulo="Para quem é o plano?"
        onVoltar={router.back}
      />
      {!canCreate ? (
        <Text accessibilityRole="alert" className="py-6 text-sm text-muted-foreground">
          Sua conta não tem permissão para criar dietas.
        </Text>
      ) : (
        <>
          <Text className="mt-4 text-sm text-muted-foreground">
            Escolha o aluno para definir a estratégia e montar as refeições.
          </Text>
          <GlassSearchField
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setLimit(20);
            }}
            placeholder="Buscar aluno…"
            className="mt-4"
          />
          <TituloDeSecao estilo="rotulo">Seus alunos</TituloDeSecao>
          <DietListFeedback
            loaded={query.data !== undefined}
            error={!!query.error}
            paused={query.fetchStatus === 'paused'}
            onRetry={() => void query.refetch()}
            noun="alunos"
          />
          {students?.length === 0 && (
            <Text className="py-6 text-sm text-muted-foreground">
              {search.trim()
                ? 'Nenhum aluno encontrado. Tente outro nome.'
                : 'Nenhum aluno vinculado. Cadastre um aluno para criar a dieta.'}
            </Text>
          )}
          {students?.slice(0, limit).map((student) => (
            <GlassChoice
              key={student.id}
              icon="person-outline"
              title={student.name}
              sub="Criar plano alimentar"
              active={false}
              onPress={() => selectStudent(student)}
            />
          ))}
          {students && students.length > limit && (
            <ToggleChip active={false} onPress={() => setLimit((current) => current + 20)}>
              Mostrar mais alunos
            </ToggleChip>
          )}
        </>
      )}
    </TelaDeVidroComFoto>
  );
}
