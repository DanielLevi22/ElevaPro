import type { Workout } from '@elevapro/shared';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { showConfirm } from '@/components/ui/appAlert';
import { EstadoDaTela } from '../../../components/aluno/EstadoDaTela';
import { useDetalheDoTreino } from '../../../hooks/useDetalheDoTreino';
import { useSessaoDeTreino } from '../../../hooks/useSessaoDeTreino';
import { useVozDaSessao } from '../../../hooks/useVozDaSessao';
import { type EstadoDaSessao, progressoDaSessao } from '../../../store/maquinaDaSessao';
import { EtapaDaSessao } from './EtapaDaSessao';

/**
 * A sessão de treino do kit (telas 4 a 8), no lugar da `ExecuteWorkoutScreen`.
 *
 * Esta tela só carrega o treino e decide as saídas; cada etapa da máquina
 * (`maquinaDaSessao`) desenha a sua tela em `EtapaDaSessao`.
 *
 * @example
 * <SessaoDeTreinoScreen treinoId={id} alunoId={user.id} mascarado={false} … />
 */
export interface SessaoDeTreinoScreenProps {
  treinoId: string;
  alunoId: string;
  /** O especialista está vendo o app como o aluno: a sessão não é gravada. */
  mascarado: boolean;
  /** Quem pode editar o catálogo ajusta também o vídeo do exercício. */
  podeEditarVideo: boolean;
  /** Depois de gravar: a ofensiva e a meta do dia, que moram em outro módulo. */
  onTreinoRegistrado: () => void;
}

export function SessaoDeTreinoScreen(props: SessaoDeTreinoScreenProps) {
  const { treino, naoEncontrado } = useDetalheDoTreino(props.treinoId);
  if (!treino) {
    return <EstadoDaTela naoEncontrado={naoEncontrado} mensagem="Treino não encontrado." />;
  }
  // A chave recria a sessão se o treino mudar: os exercícios são o estado inicial.
  return <SessaoDoTreino key={treino.id} treino={treino} {...props} />;
}

function SessaoDoTreino({ treino, ...props }: SessaoDeTreinoScreenProps & { treino: Workout }) {
  const router = useRouter();
  const { sessao, agora, despachar } = useSessaoDeTreino(treino.exercises ?? []);
  const sairSemPerguntar = useSaidaSemSalvar(sessao);
  const pedirParaFinalizar = useCallback(
    () =>
      confirmarFinalizacao(
        sessao,
        () => despachar({ tipo: 'finalizar', agora: Date.now() }),
        () => sairSemPerguntar(router.back)
      ),
    [sessao, despachar, sairSemPerguntar, router]
  );
  const voz = useVozDaSessao(sessao, despachar, pedirParaFinalizar);

  return (
    <EtapaDaSessao
      treino={treino}
      sessao={sessao}
      agora={agora}
      despachar={despachar}
      voz={voz}
      onFechar={pedirParaFinalizar}
      onSair={router.back}
      {...props}
    />
  );
}

/**
 * O X da execução encerra o treino, e não o abandona: o que foi feito vai para
 * o feedback e é gravado. Sem nenhuma série feita não há o que gravar, e aí o
 * X é só sair.
 */
function confirmarFinalizacao(sessao: EstadoDaSessao, finalizar: () => void, sair: () => void) {
  const { seriesFeitas, seriesTotais } = progressoDaSessao(sessao);
  if (seriesFeitas === 0) {
    showConfirm({
      title: 'Sair do treino?',
      message: 'Nenhuma série foi registrada ainda.',
      type: 'warning',
      confirmText: 'Sair',
      cancelText: 'Continuar',
      onConfirm: sair,
    });
    return;
  }
  showConfirm({
    title: 'Encerrar o treino?',
    message: `Você fez ${seriesFeitas} de ${seriesTotais} séries. O que foi feito será salvo.`,
    type: 'warning',
    confirmText: 'Finalizar',
    cancelText: 'Continuar',
    onConfirm: finalizar,
  });
}

/**
 * Voltar pelo gesto ou pelo botão do sistema no meio do treino perderia as
 * séries sem aviso. A pergunta só existe entre o início e o resumo: antes não
 * há nada feito, e depois já está gravado.
 */
function useSaidaSemSalvar(sessao: EstadoDaSessao): (sair: () => void) => void {
  const navigation = useNavigation();
  const emAndamento = useRef(false);
  const liberado = useRef(false);
  emAndamento.current = sessao.etapa !== 'preInicio' && sessao.etapa !== 'resumo';

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (evento) => {
        if (!emAndamento.current || liberado.current) return;
        evento.preventDefault();
        showConfirm({
          title: 'Sair sem salvar?',
          message: 'As séries desta sessão não serão gravadas.',
          type: 'danger',
          confirmText: 'Sair',
          cancelText: 'Continuar treinando',
          onConfirm: () => {
            // Sem liberar antes, o despacho dispararia este mesmo listener de novo.
            liberado.current = true;
            navigation.dispatch(evento.data.action);
          },
        });
      }),
    [navigation]
  );

  // Quem já confirmou a saída pelo X não é perguntado de novo pelo listener.
  return useCallback((sair: () => void) => {
    liberado.current = true;
    sair();
  }, []);
}
