import { evolucoesDaSessao, resumoDaSessao, seriesDaSessaoAnterior } from '@elevapro/shared';
import { useMemo, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { AjusteDoExercicio } from '../../../components/sessao/AjusteDoExercicio';
import { TelaDeFeedback } from '../../../components/sessao/TelaDeFeedback';
import { usePesoDoAluno } from '../../../hooks/usePesoDoAluno';
import { useUltimaSessaoDoTreino } from '../../../hooks/useUltimaSessaoDoTreino';
import { gravarSessaoDeForca, montarSessaoDeForca } from '../../../services/registroDaSessao';
import type { EstadoDaSessao } from '../../../store/maquinaDaSessao';
import { CompartilharTreino } from './CompartilharTreino';
import { CronometroDoTreino } from './CronometroDoTreino';
import { ExecucaoDoTreino, type PropsDoMomento } from './ExecucaoDoTreino';
import { PreInicioDoTreino } from './PreInicioDoTreino';
import { ResumoDoTreino } from './ResumoDoTreino';
import type { SessaoEmAndamentoScreenProps } from './SessaoEmAndamentoScreen';

type MomentoDaSessaoProps = PropsDoMomento &
  Omit<SessaoEmAndamentoScreenProps, 'treinoId'> & { onSair: () => void };

type SeriesAnteriores = ReturnType<typeof seriesDaSessaoAnterior>;

/**
 * Desenha a tela do momento em que a sessão está e liga cada uma ao que ela faz:
 * ajustar exercício, gravar no feedback, compartilhar no resumo.
 *
 * @example
 * <MomentoDaSessao {...props} sessao={sessao} despachar={despachar} onSair={sair} />
 */
export function MomentoDaSessao(props: MomentoDaSessaoProps) {
  const { treino, sessao, despachar, alunoId } = props;
  const anterior = useUltimaSessaoDoTreino(treino.id, alunoId);
  const anteriores = useMemo(() => seriesDaSessaoAnterior(anterior), [anterior]);
  const gravacao = useGravacaoDaSessao(props);

  switch (sessao.momento) {
    case 'preInicio':
      return (
        <PreInicioDoTreino
          treino={treino}
          anterior={anterior}
          onIniciar={() => despachar({ tipo: 'iniciar', agora: Date.now() })}
          onVoltar={props.onSair}
        />
      );
    case 'execucao':
      return <ExecucaoComAjuste {...props} anteriores={anteriores} />;
    case 'serie':
    case 'descanso':
      return <CronometroDoTreino {...props} />;
    case 'feedback':
      return (
        <TelaDeFeedback
          imagem={fotoDoGrupo(treino.muscle_group)}
          salvando={gravacao.salvando}
          onFechar={() => despachar({ tipo: 'voltarAoTreino' })}
          onSalvar={gravacao.salvar}
        />
      );
    case 'resumo':
      return <Resumo {...props} anteriores={anteriores} />;
  }
}

/** A lista da execução com a folha de ajuste do exercício tocado no lápis. */
function ExecucaoComAjuste(props: MomentoDaSessaoProps & { anteriores: SeriesAnteriores }) {
  const { sessao, despachar, podeEditarVideo } = props;
  const [ajustando, setAjustando] = useState<string | null>(null);

  return (
    <>
      <ExecucaoDoTreino {...props} onAjustar={setAjustando} />
      <AjusteDoExercicio
        item={sessao.itens.find((item) => item.id === ajustando) ?? null}
        podeEditarVideo={podeEditarVideo}
        onFechar={() => setAjustando(null)}
        onSalvar={(item) => despachar({ tipo: 'ajustarExercicio', item })}
      />
    </>
  );
}

interface GravacaoDaSessao {
  salvando: boolean;
  salvar: (pse: number, notas: string) => Promise<void>;
}

/** Grava a sessão e só então vai ao resumo: o resumo afirma que o treino foi salvo. */
function useGravacaoDaSessao({
  treino,
  sessao,
  despachar,
  alunoId,
  mascarado,
  onTreinoRegistrado,
}: MomentoDaSessaoProps): GravacaoDaSessao {
  const [salvando, setSalvando] = useState(false);

  const salvar = async (pse: number, notas: string) => {
    setSalvando(true);
    try {
      const paraGravar = montarSessaoDeForca(treino, sessao, { alunoId, pse, notas }, Date.now());
      await gravarSessaoDeForca(paraGravar, { mascarado });
      if (!mascarado) onTreinoRegistrado();
      despachar({ tipo: 'salva' });
    } catch {
      showAlert({
        type: 'error',
        title: 'Treino não salvo',
        message: 'Não consegui salvar o treino. Confira a conexão e tente de novo.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return { salvando, salvar };
}

/** O resumo e, pelo botão dele, a tela de compartilhar. */
function Resumo({
  treino,
  sessao,
  alunoId,
  anteriores,
  onSair,
}: MomentoDaSessaoProps & { anteriores: SeriesAnteriores }) {
  const [compartilhando, setCompartilhando] = useState(false);
  const { resumo, evolucoes, concluidaEm } = useResumoDaSessao(sessao, alunoId, anteriores);

  if (compartilhando) {
    return (
      <CompartilharTreino
        treino={treino}
        resumo={resumo}
        recordes={evolucoes.length}
        concluidaEm={concluidaEm}
        onVoltar={() => setCompartilhando(false)}
      />
    );
  }
  return (
    <ResumoDoTreino
      treino={treino}
      resumo={resumo}
      evolucoes={evolucoes}
      concluidaEm={concluidaEm}
      onSair={onSair}
      onCompartilhar={() => setCompartilhando(true)}
    />
  );
}

/** Volume, gasto e evoluções da sessão — o gasto usa o peso do aluno quando há. */
function useResumoDaSessao(
  sessao: EstadoDaSessao,
  alunoId: string,
  anteriores: SeriesAnteriores
): {
  resumo: ReturnType<typeof resumoDaSessao>;
  evolucoes: ReturnType<typeof evolucoesDaSessao>;
  concluidaEm: number;
} {
  const pesoKg = usePesoDoAluno(alunoId);
  const inicio = sessao.iniciadaEm ?? 0;
  const concluidaEm = sessao.concluidaEm ?? inicio;
  const itens = sessao.itens.map((item) => ({
    id: item.id,
    nome: item.exercise?.name ?? 'Exercício',
  }));
  return {
    resumo: resumoDaSessao(sessao.feitas, inicio, concluidaEm, pesoKg),
    evolucoes: evolucoesDaSessao(itens, sessao.feitas, anteriores),
    concluidaEm,
  };
}
