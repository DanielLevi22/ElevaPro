import { contagem, gruposDoTreino, treinouHoje, type Workout } from '@elevapro/shared';
import { useRouter } from 'expo-router';
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
import { useDetalheDoTreino } from '../../hooks/useDetalheDoTreino';
import { useSessoesDoAluno } from '../../hooks/useSessoesDoAluno';
import { comModo, type ModoDaRota } from '../../routes/visaoDoAluno';

/**
 * O treino antes de começar, na visão do aluno — tela 3 do fluxo do kit.
 *
 * A do especialista continua em `WorkoutDetailsScreen`, com a edição de cada
 * exercício. O botão de compartilhar do kit não entrou: não existe o que
 * compartilhar de um treino ainda não feito, e botão sem ação é pior que
 * botão ausente.
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

  const exercicios = treino.exercises ?? [];

  return (
    <TelaDeVidroComFoto
      imagem={fotoDoGrupo(treino.muscle_group)}
      folgaNoFim="botaoFixo"
      sobreposicao={
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
        <LinhaDoExercicio key={item.id} item={item} ordem={indice + 1} />
      ))}
    </TelaDeVidroComFoto>
  );
}

function CabecalhoDoTreino({ treino }: { treino: Workout }) {
  const router = useRouter();

  return (
    <>
      <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
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
