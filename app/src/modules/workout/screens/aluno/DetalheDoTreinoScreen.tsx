import { contagem, gruposDoTreino, treinouHoje, type Workout } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { showConfirm } from '@/components/ui/appAlert';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { EstadoDaTela } from '../../components/aluno/EstadoDaTela';
import { LinhaDoExercicio } from '../../components/aluno/LinhaDoExercicio';
import { ExerciseSwapSheet } from '../../components/ExerciseSwapSheet';
import { useDetalheDoTreino } from '../../hooks/useDetalheDoTreino';
import { isSelfGuidedWorkout } from '../../hooks/useExerciseSwap';
import { useExportarTreino } from '../../hooks/useExportarTreino';
import { useSessoesDoAluno } from '../../hooks/useSessoesDoAluno';
import { comModo, type ModoDaRota } from '../../routes/visaoDoAluno';
import { useTodayExercises } from '../../store/todaySwapsStore';

/**
 * O treino antes de começar, na visão do aluno — tela 3 do fluxo do kit.
 *
 * A do especialista continua em `WorkoutDetailsScreen`, com a edição de cada
 * exercício. O botão do canto exporta o treino em PDF, no papel do protocolo
 * (#431): era o que faltava para o compartilhar do kit ter o que levar.
 *
 * @example
 * <DetalheDoTreinoScreen treinoId={id} alunoId={user.id} modo={modo} />
 */
interface DetalheDoTreinoScreenProps {
  treinoId: string;
  alunoId: string;
  modo: ModoDaRota;
}

export function DetalheDoTreinoScreen({ treinoId, alunoId, modo }: DetalheDoTreinoScreenProps) {
  const { treino, naoEncontrado } = useDetalheDoTreino(treinoId);

  if (!treino)
    return <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Treino não encontrado." />;
  return <DetalheCarregado treino={treino} alunoId={alunoId} modo={modo} />;
}

/** O treino carregado, com as trocas de hoje e a folha "Trocar exercício" (6d). */
function DetalheCarregado({ treino, alunoId, modo }: IniciarTreinoProps) {
  const exercicios = useTodayExercises(treino.id, treino.exercises ?? []);
  const [trocando, setTrocando] = useState<string | null>(null);

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo(treino.muscle_group)}
      bottomSpace="fixedButton"
      overlay={
        exercicios.length > 0 ? (
          <IniciarTreino treino={treino} alunoId={alunoId} modo={modo} />
        ) : null
      }
    >
      <CabecalhoDoTreino treino={treino} />
      <TituloDeSecao
        estilo="rotulo"
        acao={contagem(exercicios.length, 'movimento planejado', 'movimentos planejados')}
      >
        Lista de exercícios
      </TituloDeSecao>
      {exercicios.map((item, indice) => (
        <LinhaDoExercicio
          key={item.id}
          item={item}
          ordem={indice + 1}
          onMais={() => setTrocando(item.id)}
        />
      ))}
      <ExerciseSwapSheet
        item={exercicios.find((item) => item.id === trocando) ?? null}
        workoutId={treino.id}
        studentId={alunoId}
        selfGuided={isSelfGuidedWorkout(treino, alunoId)}
        onSwapped={() => undefined}
        onClose={() => setTrocando(null)}
      />
    </TelaDeVidroComFoto>
  );
}

function CabecalhoDoTreino({ treino }: { treino: Workout }) {
  const router = useRouter();
  const { exportar, gerando } = useExportarTreino(treino);

  return (
    <>
      <View className="flex-row items-center justify-between">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        {(treino.exercises ?? []).length > 0 ? (
          <BotaoRedondo
            icone="download"
            rotulo={gerando ? 'Gerando o PDF do treino' : 'Exportar o treino em PDF'}
            onPress={exportar}
          />
        ) : null}
      </View>
      <View className="mt-[3.625rem]">
        <View className="mb-2.5 flex-row flex-wrap gap-1.5">
          {gruposDoTreino(treino).map((grupo) => (
            <Chip key={grupo}>{grupo}</Chip>
          ))}
        </View>
        <Text className="text-[1.875rem] font-bold leading-tight tracking-tight text-hero">
          {treino.title}
        </Text>
        {treino.description ? (
          <Text className="mt-[0.4375rem] text-[0.84375rem] leading-snug text-hero-secondary">
            {treino.description}
          </Text>
        ) : null}
      </View>
    </>
  );
}

interface IniciarTreinoProps {
  treino: Workout;
  alunoId: string;
  modo: ModoDaRota;
}

/**
 * O botão que de fato começa o treino — e por isso é aqui que mora a pergunta
 * antes de um segundo treino no mesmo dia. Estava no cartão da fase, que só
 * abre este detalhe: quem entrava pela lista ou pela tela inicial começava sem
 * ser perguntado.
 *
 */
function IniciarTreino({ treino, alunoId, modo }: IniciarTreinoProps) {
  const router = useRouter();
  const { ultima } = useSessoesDoAluno(alunoId);

  const iniciar = () => router.push(comModo(ROUTES.WORKOUTS.EXECUTE(treino.id), modo));
  const confirmarEIniciar = () => {
    if (!treinouHoje(ultima, new Date())) return iniciar();
    showConfirm({
      title: 'Treino realizado',
      message: 'Você já registrou um treino hoje. Deseja realizar outro treino?',
      type: 'warning',
      confirmText: 'Sim, treinar',
      cancelText: 'Cancelar',
      onConfirm: iniciar,
    });
  };

  return <BotaoFixoNoRodape rotulo="Iniciar treino" icone="play" onPress={confirmarEIniciar} />;
}
