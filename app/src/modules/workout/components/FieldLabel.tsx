import { Text } from 'react-native';

/**
 * O rótulo miúdo em caixa alta sobre um campo do cartão — "Início", "Divisão
 * de treino". Menor e mais justo que o `TituloDeSecao` "rotulo", que abre seção.
 *
 * @example <FieldLabel>Término</FieldLabel>
 */
export function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-[0.625rem] font-bold uppercase tracking-widest text-placeholder">
      {children}
    </Text>
  );
}
