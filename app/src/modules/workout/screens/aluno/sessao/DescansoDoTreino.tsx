import { formatarDuracao } from '@elevapro/shared';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import {
  AnelDoDescanso,
  ControlesDoDescanso,
  ProximaSerie,
  ResumoDaSerie,
} from '../../../components/sessao/PecasDoDescanso';
import { SeriesDoExercicio } from '../../../components/sessao/ProgressoDaSessao';
import { TopoDaSessao } from '../../../components/sessao/TopoDaSessao';
import {
  progressoDaSessao,
  proximaSerie,
  restanteDoDescanso,
  seriesFeitasDo,
} from '../../../store/maquinaDaSessao';
import type { PropsDaEtapa } from './ExecucaoDoTreino';

/**
 * O descanso em tela cheia do kit (tela 6), no lugar da barra de descanso que
 * ficava no rodapé da execução.
 *
 * O resumo mostra a série que acabou de ser registrada, e o "A seguir" a que
 * vem — que pode ser a primeira do exercício seguinte.
 *
 * @example
 * <DescansoDoTreino treino={treino} sessao={sessao} agora={agora} … />
 */
export function DescansoDoTreino({
  treino,
  sessao,
  agora,
  despachar,
  voz,
  onFechar,
}: PropsDaEtapa) {
  const proxima = proximaSerie(sessao);
  const progresso = progressoDaSessao(sessao);

  return (
    <TelaDeVidroComFoto imagem={fotoDoGrupo(treino.muscle_group)} folgaNoFim="nenhuma">
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

      <AnelDoDescanso
        restante={restanteDoDescanso(sessao, agora)}
        total={sessao.descanso?.total ?? 0}
      />
      {sessao.ultima ? <ResumoDaSerie serie={sessao.ultima} /> : null}

      {proxima ? (
        <>
          <TituloDeSecao estilo="rotulo" acao="Prepare-se para a próxima série">
            A seguir
          </TituloDeSecao>
          <ProximaSerie item={proxima.item} numero={proxima.numero} />
        </>
      ) : null}

      <ControlesDoDescanso
        onAjustar={(segundos) =>
          despachar({ tipo: 'ajustarDescanso', segundos, agora: Date.now() })
        }
        onRetomar={() => despachar({ tipo: 'terminarDescanso' })}
      />
    </TelaDeVidroComFoto>
  );
}
