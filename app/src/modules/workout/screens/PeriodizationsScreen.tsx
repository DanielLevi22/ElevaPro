import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { StudentPickerModal } from '@/components/StudentPickerModal';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { Chip } from '@/components/ui/Chip';
import { SearchModal } from '@/components/ui/SearchModal';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { useStudentStore } from '@/students';
import { PeriodizationHeroCard } from '../components/PeriodizationHeroCard';
import { PeriodizationHistoryRow } from '../components/PeriodizationHistoryRow';
import { type Periodization, useWorkoutStore } from '../store/workoutStore';

type Filtro = 'todas' | 'concluidas' | 'planejadas';

const STATUS_DO_FILTRO: Record<Exclude<Filtro, 'todas'>, Periodization['status']> = {
  concluidas: 'completed',
  planejadas: 'planned',
};

/**
 * A lista de periodizações do especialista e do praticante — a mesma casca
 * de vidro da lista do aluno (`PeriodizacoesDoAlunoScreen`), com uma diferença:
 * aqui pode haver mais de uma periodização em andamento ao mesmo tempo, uma
 * por aluno, então cada ativa vira um cartão-herói (#335).
 *
 * @example
 * <PeriodizationsScreen />
 */
export default function PeriodizationsScreen() {
  const router = useRouter();
  const { user, accountType } = useAuthStore();
  const isSpecialist = accountType === 'specialist';
  const isMember = accountType === 'member';
  const { periodizations, isLoading, fetchPeriodizations } = useWorkoutStore();
  const { students, fetchStudents } = useStudentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  useEffect(() => {
    if (user?.id && accountType) fetchPeriodizations(user.id);
    if (user?.id && isSpecialist) fetchStudents(user.id);
  }, [user?.id, accountType, isSpecialist, fetchPeriodizations, fetchStudents]);

  // O `StudentPickerModal` é anterior ao módulo de alunos ganhar `avatar_url`
  // nulável — aqui é o único ponto de contato entre os dois formatos.
  const studentsParaPicker = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        full_name: s.full_name,
        avatar_url: s.avatar_url ?? undefined,
      })),
    [students]
  );

  const buscadas = useMemo(() => {
    if (!searchQuery.trim()) return periodizations;
    const query = searchQuery.toLowerCase();
    return periodizations.filter((p) => {
      const nome = p.name?.toLowerCase() ?? '';
      const aluno = p.student?.full_name?.toLowerCase() ?? '';
      return nome.includes(query) || aluno.includes(query);
    });
  }, [periodizations, searchQuery]);

  const ativas = useMemo(() => buscadas.filter((p) => p.status === 'active'), [buscadas]);
  const historico = useMemo(
    () =>
      buscadas.filter(
        (p) =>
          p.status !== 'active' && (filtro === 'todas' || p.status === STATUS_DO_FILTRO[filtro])
      ),
    [buscadas, filtro]
  );

  const abrir = useCallback(
    (periodizacao: Periodization, executar = false) => {
      router.push(
        executar
          ? ROUTES.WORKOUTS.PERIODIZATION_EXECUTE(periodizacao.id)
          : ROUTES.WORKOUTS.PERIODIZATION(periodizacao.id)
      );
    },
    [router]
  );

  // O `member` cria para si mesmo, sem escolher aluno; o `specialist` escolhe
  // antes de entrar no wizard, que não tem seletor embutido.
  const abrirCriacao = useCallback(() => {
    if (isSpecialist) {
      setShowStudentPicker(true);
      return;
    }
    if (user?.id) {
      router.push({ pathname: ROUTES.WORKOUTS.WIZARD_STRUCTURE, params: { studentId: user.id } });
    }
  }, [isSpecialist, user?.id, router]);

  const onRefresh = useCallback(() => {
    if (user?.id) fetchPeriodizations(user.id);
  }, [user?.id, fetchPeriodizations]);

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo('braços')}
      refresh={{ refreshing: isLoading, onRefresh }}
    >
      <CabecalhoSobreFoto
        sobrelinha={isSpecialist ? 'Gestão de planejamento' : 'Meus treinos'}
        titulo={isSpecialist ? 'Alunos' : 'Periodizações'}
        direita={
          <View className="flex-row items-center gap-2">
            <BotaoRedondo
              icone="search"
              rotulo="Buscar periodização"
              onPress={() => setIsSearchModalVisible(true)}
            />
            <BotaoRedondo icone="plus" rotulo="Nova periodização" onPress={abrirCriacao} />
          </View>
        }
      />

      <SearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {isSpecialist ? (
        <StudentPickerModal
          visible={showStudentPicker}
          onClose={() => setShowStudentPicker(false)}
          students={studentsParaPicker}
          onSelect={(student) => {
            setShowStudentPicker(false);
            router.push({
              pathname: ROUTES.WORKOUTS.WIZARD_STRUCTURE,
              params: { studentId: student.id, studentName: student.full_name ?? undefined },
            });
          }}
        />
      ) : null}

      <ConteudoDaLista
        carregando={isLoading}
        vazio={buscadas.length === 0}
        especialista={isSpecialist}
      >
        {ativas.map((periodizacao) => (
          <PeriodizationHeroCard
            key={periodizacao.id}
            periodizacao={periodizacao}
            nomeDoAluno={isSpecialist ? (periodizacao.student?.full_name ?? undefined) : undefined}
            onPress={() => abrir(periodizacao, isMember)}
          />
        ))}

        <FiltrosDePeriodizacoes periodizacoes={buscadas} filtro={filtro} onMudar={setFiltro} />

        <TituloDeSecao estilo="rotulo" acao="Mais recentes">
          Histórico
        </TituloDeSecao>
        {historico.map((periodizacao) => (
          <PeriodizationHistoryRow
            key={periodizacao.id}
            periodizacao={periodizacao}
            onPress={() => abrir(periodizacao)}
          />
        ))}
        {historico.length === 0 ? (
          <Text className="py-6 text-center text-micro text-muted-foreground">
            Nenhuma periodização aqui.
          </Text>
        ) : null}
      </ConteudoDaLista>
    </TelaDeVidroComFoto>
  );
}

interface ConteudoDaListaProps {
  carregando: boolean;
  vazio: boolean;
  especialista: boolean;
  children: React.ReactNode;
}

/** Carregando e lista vazia antes do conteúdo — o "criar" some do vazio quando é o aluno lendo. */
function ConteudoDaLista({ carregando, vazio, especialista, children }: ConteudoDaListaProps) {
  const cores = useCores();
  if (carregando) return <ActivityIndicator className="mt-10" color={cores.primary} />;
  if (vazio) {
    return (
      <Text className="px-6 py-10 text-center text-legenda text-muted-foreground">
        {especialista
          ? 'Crie um planejamento para seus alunos.'
          : 'Crie sua primeira periodização de treino.'}
      </Text>
    );
  }
  return <>{children}</>;
}

interface FiltrosDePeriodizacoesProps {
  periodizacoes: Periodization[];
  filtro: Filtro;
  onMudar: (filtro: Filtro) => void;
}

function FiltrosDePeriodizacoes({ periodizacoes, filtro, onMudar }: FiltrosDePeriodizacoesProps) {
  const quantos = (status: Periodization['status']) =>
    periodizacoes.filter((p) => p.status === status).length;
  const opcoes: { chave: Filtro; rotulo: string }[] = [
    { chave: 'todas', rotulo: `Todas · ${periodizacoes.length}` },
    { chave: 'concluidas', rotulo: `Concluídas · ${quantos('completed')}` },
    { chave: 'planejadas', rotulo: `Planejadas · ${quantos('planned')}` },
  ];

  return (
    <View className="mt-4 flex-row flex-wrap gap-[0.4375rem]">
      {opcoes.map((opcao) => (
        <TouchableOpacity
          key={opcao.chave}
          onPress={() => onMudar(opcao.chave)}
          accessibilityRole="button"
          accessibilityState={{ selected: filtro === opcao.chave }}
        >
          <Chip tom={filtro === opcao.chave ? 'destaque' : 'neutro'}>{opcao.rotulo}</Chip>
        </TouchableOpacity>
      ))}
    </View>
  );
}
