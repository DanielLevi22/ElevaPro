import { screen } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';

/**
 * Os elementos nativos de um tipo na tela renderizada — o `View`, o
 * `ActivityIndicator`, o `RCTScrollView`, ou um mock como `'Ionicons'`.
 *
 * O RNTL 14 tirou o `UNSAFE_getAllByType`: a árvore só tem elementos nativos,
 * e eles são achados pelo nome do tipo, não pelo componente.
 *
 * @example allHostsOfType('ActivityIndicator').map((node) => node.props.color)
 */
export function allHostsOfType(type: string): TestInstance[] {
  return screen.container.queryAll((node) => node.type === type);
}

/**
 * O único elemento nativo do tipo; falha se houver nenhum ou mais de um.
 *
 * @example hostOfType('RCTScrollView').props.contentContainerStyle
 */
export function hostOfType(type: string): TestInstance {
  const found = allHostsOfType(type);
  if (found.length !== 1) {
    throw new Error(`Esperado 1 elemento nativo "${type}" na tela, achei ${found.length}.`);
  }
  return found[0];
}
