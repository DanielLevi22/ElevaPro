import { showConfirm } from '@/components/ui/appAlert';
import {
  type EstadoDaSessao,
  exercicioConcluido,
  progressoDaSessao,
} from '../../../store/maquinaDaSessao';

interface SaidasDaConclusao {
  /** Leva ao feedback e grava o que foi feito. */
  finalizar: () => void;
  /** Sai sem gravar: só quando não há série nenhuma. */
  sair: () => void;
}

/**
 * O "Concluir treino" da lista (e o "finalizar" da voz). Encerra o treino, e não
 * o abandona: o que foi feito vai para o feedback e é gravado (#441).
 *
 * Com tudo feito, conclui direto. Faltando exercício, diz quais e deixa concluir
 * mesmo assim. Sem nenhuma série feita não há o que gravar, e aí é só sair.
 *
 * @example confirmarConclusao(sessao, { finalizar, sair: () => router.back() })
 */
export function confirmarConclusao(sessao: EstadoDaSessao, saidas: SaidasDaConclusao): void {
  if (progressoDaSessao(sessao).seriesFeitas === 0) {
    perguntarSeSai(saidas.sair);
    return;
  }
  const faltando = sessao.itens.filter((item) => !exercicioConcluido(sessao, item));
  if (faltando.length === 0) {
    saidas.finalizar();
    return;
  }
  const nomes = faltando.map((item) => item.exercise?.name ?? 'Exercício').join(', ');
  showConfirm({
    title: 'Concluir o treino?',
    message: `Ainda faltam: ${nomes}. O que foi feito será salvo.`,
    type: 'warning',
    confirmText: 'Concluir',
    cancelText: 'Continuar',
    onConfirm: saidas.finalizar,
  });
}

function perguntarSeSai(sair: () => void): void {
  showConfirm({
    title: 'Sair do treino?',
    message: 'Nenhuma série foi registrada ainda.',
    type: 'warning',
    confirmText: 'Sair',
    cancelText: 'Continuar',
    onConfirm: sair,
  });
}
