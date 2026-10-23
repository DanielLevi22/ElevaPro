import { shortSession, type Workout } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { showConfirm } from '@/components/ui/appAlert';
import { useConfirmLeave } from '@/navigation/useConfirmLeave';
import { EstadoDaTela } from '../../../components/aluno/EstadoDaTela';
import { useDetalheDoTreino } from '../../../hooks/useDetalheDoTreino';
import { useRestOnLockScreen } from '../../../hooks/useRestOnLockScreen';
import { useSessaoEmAndamento } from '../../../hooks/useSessaoEmAndamento';
import { useVozDaSessao } from '../../../hooks/useVozDaSessao';
import type { EstadoDaSessao } from '../../../store/maquinaDaSessao';
import { useTodayExercises } from '../../../store/todaySwapsStore';
import { confirmarConclusao } from './confirmarConclusao';
import { MomentoDaSessao } from './MomentoDaSessao';

export interface SessaoEmAndamentoScreenProps {
  treinoId: string;
  alunoId: string;
  /** Quem pode editar o catálogo ajusta também o vídeo do exercício. */
  podeEditarVideo: boolean;
  /** Depois de gravar: a ofensiva e a meta do dia, que moram em outro módulo. */
  onTreinoRegistrado: () => void;
  /** "Só tenho 20 min" (#376, F3): os três primeiros exercícios, e conta como treino. */
  curta?: boolean;
}

/**
 * A sessão de treino do kit (telas 4 a 8), no lugar da `ExecuteWorkoutScreen`.
 *
 * Esta tela só carrega o treino e decide as saídas; cada momento da máquina
 * (`maquinaDaSessao`) desenha a sua tela em `MomentoDaSessao`.
 *
 * @example
 * <SessaoEmAndamentoScreen treinoId={id} alunoId={user.id} … />
 */
export function SessaoEmAndamentoScreen(props: SessaoEmAndamentoScreenProps) {
  const { treino, naoEncontrado } = useDetalheDoTreino(props.treinoId);
  if (!treino) {
    return <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Treino não encontrado." />;
  }
  // A versão curta é o mesmo treino com menos exercícios: o pré-início, a
  // sessão e o resumo contam só os três.
  const daSessao = props.curta
    ? { ...treino, exercises: shortSession(treino.exercises ?? []) }
    : treino;
  // A chave recria a sessão se o treino mudar: os exercícios são o estado inicial.
  return <SessaoDoTreino key={treino.id} treino={daSessao} {...props} />;
}

/** A sessão montada, com o treino já carregado: liga a máquina, a voz e as saídas. */
function SessaoDoTreino({ treino, ...props }: SessaoEmAndamentoScreenProps & { treino: Workout }) {
  const router = useRouter();
  // A sessão começa com o que foi trocado "só hoje" no detalhe.
  const itensDeHoje = useTodayExercises(treino.id, treino.exercises ?? []);
  const { sessao, agora, despachar } = useSessaoEmAndamento(itensDeHoje);
  const sairSemPerguntar = useSaidaSemSalvar(sessao);
  const pedirParaFinalizar = useCallback(
    () =>
      confirmarConclusao(sessao, {
        finalizar: () => despachar({ tipo: 'finalizar', agora: Date.now() }),
        sair: () => sairSemPerguntar(router.back),
      }),
    [sessao, despachar, sairSemPerguntar, router]
  );
  const voz = useVozDaSessao(sessao, despachar, pedirParaFinalizar);
  useRestOnLockScreen(sessao, despachar);

  return (
    <MomentoDaSessao
      treino={treino}
      sessao={sessao}
      agora={agora}
      despachar={despachar}
      voz={voz}
      onConcluir={pedirParaFinalizar}
      onSair={router.back}
      {...props}
    />
  );
}

/**
 * Voltar pelo gesto ou pelo botão do sistema no meio do treino perderia as
 * séries sem aviso. A pergunta só existe entre o início e o resumo: antes não
 * há nada feito, e depois já está gravado.
 */
function useSaidaSemSalvar(sessao: EstadoDaSessao): (sair: () => void) => void {
  const emAndamento = sessao.momento !== 'preInicio' && sessao.momento !== 'resumo';
  // Quem já confirmou a saída pelo X segue pelo retorno, sem ser perguntado de novo.
  return useConfirmLeave(emAndamento, (leave) =>
    showConfirm({
      title: 'Sair sem salvar?',
      message: 'As séries desta sessão não serão gravadas.',
      type: 'danger',
      confirmText: 'Sair',
      cancelText: 'Continuar treinando',
      onConfirm: leave,
    })
  );
}
