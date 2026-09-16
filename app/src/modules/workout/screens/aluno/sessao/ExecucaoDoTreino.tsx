import {
  formatarDuracao,
  ganhoDeCarga,
  numeroDaPrescricao,
  type SerieFeita,
  type Workout,
} from '@elevapro/shared';
import { View } from 'react-native';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { CartaoEmExecucao } from '../../../components/sessao/CartaoEmExecucao';
import { ExercicioASeguir, ExercicioFeito } from '../../../components/sessao/LinhasDaExecucao';
import { ProgressoDaSessao } from '../../../components/sessao/ProgressoDaSessao';
import { TopoDaSessao } from '../../../components/sessao/TopoDaSessao';
import {
  type AcaoDaSessao,
  type EstadoDaSessao,
  exercicioConcluido,
  progressoDaSessao,
  tempoDaSessao,
} from '../../../store/maquinaDaSessao';

/**
 * A execução do kit (tela 5): o que já foi feito, o exercício em execução e o
 * que vem a seguir.
 *
 * @example
 * <ExecucaoDoTreino treino={treino} sessao={sessao} agora={agora} … />
 */
export interface PropsDoMomento {
  treino: Workout;
  sessao: EstadoDaSessao;
  agora: number;
  despachar: (acao: AcaoDaSessao) => void;
  voz: Parameters<typeof TopoDaSessao>[0]['voz'];
  onFechar: () => void;
}

interface ExecucaoDoTreinoProps extends PropsDoMomento {
  anteriores: Record<string, SerieFeita[]>;
  onAjustar: (itemId: string) => void;
}

export function ExecucaoDoTreino({
  treino,
  sessao,
  agora,
  despachar,
  voz,
  onFechar,
  anteriores,
  onAjustar,
}: ExecucaoDoTreinoProps) {
  const atual = sessao.itens.find((item) => item.id === sessao.atualId);
  const outros = sessao.itens.filter((i) => i.id !== atual?.id);
  const feitos = outros.filter((i) => exercicioConcluido(sessao, i));
  const aSeguir = outros.filter((i) => !exercicioConcluido(sessao, i));

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo(treino.muscle_group)}>
      <TopoDaSessao
        titulo={treino.title}
        tempo={formatarDuracao(tempoDaSessao(sessao, agora))}
        voz={voz}
        onFechar={onFechar}
      />
      <ProgressoDaSessao progresso={progressoDaSessao(sessao)} />

      <View className="mt-0.5">
        {feitos.map((item) => (
          <ExercicioFeito key={item.id} item={item} feitas={sessao.feitas[item.id] ?? []} />
        ))}
      </View>

      {atual ? (
        <CartaoEmExecucao
          item={atual}
          feitas={sessao.feitas[atual.id] ?? []}
          ganho={ganhoDeCarga(numeroDaPrescricao(atual.weight), anteriores[atual.id])}
          onIniciar={() => despachar({ tipo: 'abrirSerie' })}
          onAjustar={() => onAjustar(atual.id)}
        />
      ) : null}

      {aSeguir.length > 0 ? <TituloDeSecao estilo="rotulo">A seguir</TituloDeSecao> : null}
      {aSeguir.map((item) => (
        <ExercicioASeguir
          key={item.id}
          item={item}
          onEscolher={() => despachar({ tipo: 'escolher', itemId: item.id })}
        />
      ))}
    </TelaDeVidroComFoto>
  );
}
