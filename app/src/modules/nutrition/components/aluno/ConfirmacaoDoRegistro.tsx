import { TouchableOpacity, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { RegistroNoDiario } from '../../hooks/useRegistroNoDiario';

/**
 * O diálogo antes de gravar um item extra: o que entra e em qual refeição.
 *
 * A refeição vem sugerida, e o aluno troca tocando em outra. Sem sugestão, a
 * confirmação espera a escolha.
 *
 * @example
 * <ConfirmacaoDoRegistro registro={registro} />
 */
export function ConfirmacaoDoRegistro({ registro }: { registro: RegistroNoDiario }) {
  return (
    <ConfirmModal
      visible={registro.pedido !== null}
      onClose={registro.cancelar}
      onConfirm={registro.confirmar}
      title="Adicionar ao que comi hoje"
      message={`${registro.pedido?.descricao ?? ''}. Em qual refeição?`}
      confirmText="Adicionar"
      confirmacaoDesabilitada={registro.refeicaoEscolhida === null}
    >
      <View className="flex-row flex-wrap justify-center gap-2">
        {registro.refeicoes.map((refeicao) => {
          const escolhida = refeicao.id === registro.refeicaoEscolhida;
          const horario = refeicao.meal_time?.slice(0, 5);
          return (
            <TouchableOpacity
              key={refeicao.id}
              onPress={() => registro.escolherRefeicao(refeicao.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: escolhida }}
            >
              <Chip tom={escolhida ? 'destaque' : 'neutro'}>
                {horario ? `${refeicao.name} · ${horario}` : refeicao.name}
              </Chip>
            </TouchableOpacity>
          );
        })}
      </View>
    </ConfirmModal>
  );
}
