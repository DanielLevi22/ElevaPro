import { formatarDuracao } from '@elevapro/shared';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { textoDasRepeticoes } from '../../../components/sessao/LinhasDaExecucao';
import {
  AnelDoCronometro,
  CartaoDaSerie,
  ControlesDoCronometro,
  ResumoDaSerie,
} from '../../../components/sessao/PecasDoCronometro';
import { SeriesDoExercicio } from '../../../components/sessao/ProgressoDaSessao';
import { TopoDaSessao } from '../../../components/sessao/TopoDaSessao';
import {
  type EstadoDaSessao,
  progressoDaSessao,
  proximaSerie,
  restanteDoDescanso,
  seriesFeitasDo,
  tempoDaSerie,
} from '../../../store/maquinaDaSessao';
import type { PropsDaEtapa } from './ExecucaoDoTreino';

/**
 * O cronômetro em tela cheia do kit (tela 6), nas duas etapas que o usam:
 *
 * - **série**: abre parado em 00:00, e o play conta o tempo do exercício, com o
 *   anel enchendo uma volta por minuto. Ao lado, zerar e concluir;
 * - **descanso**: começa sozinho quando a série é concluída, e o anel esvazia
 *   até o intervalo acabar. Ao lado, −15 s e +15 s.
 *
 * @example
 * <CronometroDoTreino treino={treino} sessao={sessao} agora={agora} … />
 */
export function CronometroDoTreino(props: PropsDaEtapa) {
  const { treino, sessao, agora, voz, onFechar } = props;
  const proxima = proximaSerie(sessao);
  const progresso = progressoDaSessao(sessao);

  return (
    <TelaDeVidroComFoto imagem={fotoDoGrupo(treino.muscle_group)}>
      <TopoDaSessao
        titulo={treino.title}
        tempo={formatarDuracao((agora - (sessao.iniciadaEm ?? agora)) / 1000)}
        voz={voz}
        onFechar={onFechar}
      />
      {proxima ? (
        <SeriesDoExercicio
          exercicio={progresso.exercicio}
          exercicios={progresso.exercicios}
          nome={proxima.item.exercise?.name ?? 'Exercício'}
          feitas={seriesFeitasDo(sessao, proxima.item.id)}
          total={proxima.item.sets ?? 0}
        />
      ) : null}
      {sessao.etapa === 'serie' ? <EtapaDaSerie {...props} /> : <EtapaDoDescanso {...props} />}
    </TelaDeVidroComFoto>
  );
}

/** Uma volta do anel por minuto: a série não tem duração prescrita para encher. */
const VOLTA_DO_EXERCICIO = 60;

function EtapaDaSerie({ sessao, agora, despachar }: PropsDaEtapa) {
  const proxima = proximaSerie(sessao);
  const segundos = tempoDaSerie(sessao, agora);
  // Aos 60 s o anel está cheio, e não vazio: o resto zero só vale antes de começar.
  const volta = segundos % VOLTA_DO_EXERCICIO || (segundos > 0 ? VOLTA_DO_EXERCICIO : 0);

  return (
    <>
      <AnelDoCronometro
        rotulo="Execução"
        segundos={segundos}
        valor={volta}
        meta={VOLTA_DO_EXERCICIO}
        legenda={proxima ? `Série ${proxima.numero} de ${proxima.item.sets ?? 0}` : ''}
      />
      {proxima ? (
        <>
          <TituloDeSecao estilo="rotulo" acao={textoDasRepeticoes(proxima.item.reps, 'repetições')}>
            Agora
          </TituloDeSecao>
          <CartaoDaSerie item={proxima.item} numero={proxima.numero} />
        </>
      ) : null}
      <ControlesDoCronometro
        correndo={sessao.serie !== null && sessao.serie.desde !== null}
        rotuloParado={segundos > 0 ? 'Retomar' : 'Iniciar'}
        onAlternar={() => despachar({ tipo: 'alternarSerie', agora: Date.now() })}
        esquerda={{
          icone: 'refresh',
          rotulo: 'Zerar',
          descricao: 'Zerar o tempo do exercício',
          onPress: () => despachar({ tipo: 'zerarSerie' }),
        }}
        direita={{
          icone: 'checkmark',
          rotulo: 'Concluir',
          descricao: 'Concluir a série e começar o descanso',
          onPress: () => despachar({ tipo: 'concluirSerie', agora: Date.now() }),
        }}
        saida={{ rotulo: 'Voltar à lista', onPress: () => despachar({ tipo: 'fecharSerie' }) }}
      />
    </>
  );
}

function EtapaDoDescanso({ sessao, agora, despachar }: PropsDaEtapa) {
  const proxima = proximaSerie(sessao);
  const restante = restanteDoDescanso(sessao, agora);
  const total = sessao.descanso?.total ?? 0;
  const ajustar = (segundos: number) =>
    despachar({ tipo: 'ajustarDescanso', segundos, agora: Date.now() });

  return (
    <>
      <AnelDoCronometro
        rotulo="Descanso"
        segundos={restante}
        valor={restante}
        meta={total}
        legenda={`Intervalo de ${total} s`}
      />
      {sessao.ultima ? (
        <ResumoDaSerie serie={sessao.ultima} duracao={sessao.duracaoDaUltima} />
      ) : null}
      {proxima ? (
        <>
          <TituloDeSecao estilo="rotulo" acao="Prepare-se para a próxima série">
            A seguir
          </TituloDeSecao>
          <CartaoDaSerie item={proxima.item} numero={proxima.numero} />
        </>
      ) : null}
      <ControlesDoCronometro
        correndo={descansoCorrendo(sessao)}
        rotuloParado="Retomar"
        onAlternar={() => despachar({ tipo: 'alternarDescanso', agora: Date.now() })}
        esquerda={{
          icone: 'play-back',
          rotulo: '−15 s',
          descricao: 'Menos 15 segundos de descanso',
          onPress: () => ajustar(-PASSO_DO_AJUSTE),
        }}
        direita={{
          icone: 'play-forward',
          rotulo: '+15 s',
          descricao: 'Mais 15 segundos de descanso',
          onPress: () => ajustar(PASSO_DO_AJUSTE),
        }}
        saida={{ rotulo: 'Pular descanso', onPress: () => despachar({ tipo: 'terminarDescanso' }) }}
      />
    </>
  );
}

const PASSO_DO_AJUSTE = 15;

function descansoCorrendo(sessao: EstadoDaSessao): boolean {
  return sessao.descanso !== null && sessao.descanso.pausadoCom === null;
}
