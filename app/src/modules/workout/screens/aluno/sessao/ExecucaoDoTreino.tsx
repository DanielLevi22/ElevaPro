import {
  formatarDuracao,
  ganhoDeCarga,
  type SerieFeita,
  type Workout,
  type WorkoutExercise,
} from '@elevapro/shared';
import { View } from 'react-native';
import { BotaoFixoNoRodape } from '@/components/ui/BotaoFixoNoRodape';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
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
import { prescriptionSummary } from '../../../store/sessionPlan';

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
  /** O "Concluir treino": pergunta o que falta e leva ao feedback. */
  onConcluir: () => void;
  /** Sai da sessão; o meio do treino pergunta antes de perder as séries. */
  onSair: () => void;
}

interface ExecucaoDoTreinoProps extends PropsDoMomento {
  anteriores: Record<string, SerieFeita[]>;
  onAjustar: (itemId: string) => void;
  onTrocar: (itemId: string) => void;
}

export function ExecucaoDoTreino({
  treino,
  sessao,
  agora,
  despachar,
  voz,
  onConcluir,
  onSair,
  anteriores,
  onAjustar,
  onTrocar,
}: ExecucaoDoTreinoProps) {
  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo(treino.muscle_group)}
      bottomSpace="fixedButton"
      overlay={
        <BotaoFixoNoRodape rotulo="Concluir treino" icone="checkmark" onPress={onConcluir} />
      }
    >
      <TopoDaSessao
        titulo={treino.title}
        tempo={formatarDuracao(tempoDaSessao(sessao, agora))}
        voz={voz}
        onVoltar={onSair}
      />
      <ProgressoDaSessao progresso={progressoDaSessao(sessao)} />

      {/* Na ordem do treino, cada exercício no lugar dele: escolher outro abre o
          cartão ali, e nada troca de posição. Feitos em cima e "A seguir" embaixo
          faziam o cartão ficar parado trocando os dados, sem o aluno perceber (#441). */}
      <View className="mt-3 gap-[0.5625rem]">
        {sessao.itens.map((item) => (
          <LinhaDaExecucao
            key={item.id}
            item={item}
            sessao={sessao}
            despachar={despachar}
            anteriores={anteriores}
            onAjustar={onAjustar}
            onTrocar={onTrocar}
          />
        ))}
      </View>
    </TelaDeVidroComFoto>
  );
}

type LinhaDaExecucaoProps = Pick<
  ExecucaoDoTreinoProps,
  'sessao' | 'despachar' | 'anteriores' | 'onAjustar' | 'onTrocar'
> & { item: WorkoutExercise };

/** Um exercício da lista: o cartão, se é o atual; feito ou a seguir, se não. */
function LinhaDaExecucao({
  item,
  sessao,
  despachar,
  anteriores,
  onAjustar,
  onTrocar,
}: LinhaDaExecucaoProps) {
  const feitas = sessao.feitas[item.id] ?? [];
  if (item.id === sessao.atualId) {
    return (
      <CartaoEmExecucao
        item={item}
        feitas={feitas}
        ganho={ganhoDeCarga(prescriptionSummary(item).load, anteriores[item.id])}
        onIniciar={() => despachar({ tipo: 'abrirSerie' })}
        onConcluirTodas={() => despachar({ tipo: 'concluirTodas', agora: Date.now() })}
        onAjustar={() => onAjustar(item.id)}
        onTrocar={() => onTrocar(item.id)}
      />
    );
  }
  if (exercicioConcluido(sessao, item)) return <ExercicioFeito item={item} feitas={feitas} />;
  return (
    <ExercicioASeguir
      item={item}
      onEscolher={() => despachar({ tipo: 'escolher', itemId: item.id })}
    />
  );
}
