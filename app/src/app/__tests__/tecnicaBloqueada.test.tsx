import { render, screen } from '@testing-library/react-native';
import Tecnica from '../tecnica';
import AnaliseTecnica from '../tecnica/agachamento';

/**
 * A Análise de Técnica fica bloqueada enquanto está em desenvolvimento.
 *
 * O bloqueio é na rota, e não só no card: um link direto também não pode abrir
 * a câmera nem pedir a autorização de uma análise que ainda não foi liberada.
 */

let mockReleased = false;
jest.mock('@/shared/technique/release', () => ({
  get TECHNIQUE_RELEASED() {
    return mockReleased;
  },
}));

jest.mock('@/technique', () => {
  const { Text } = require('react-native');
  return {
    ExerciciosDaTecnicaScreen: () => <Text>lista de exercícios</Text>,
    AnaliseDeTecnicaScreen: () => <Text>câmera da análise</Text>,
    TecnicaEmDesenvolvimento: () => <Text>em desenvolvimento</Text>,
  };
});

describe('Análise de Técnica em desenvolvimento', () => {
  it.each([
    ['a lista', Tecnica, 'lista de exercícios'],
    ['a câmera', AnaliseTecnica, 'câmera da análise'],
  ])('bloqueia %s e mostra o aviso', async (_tela, Rota, conteudo) => {
    mockReleased = false;
    await render(<Rota />);

    expect(screen.getByText('em desenvolvimento')).toBeTruthy();
    expect(screen.queryByText(conteudo)).toBeNull();
  });

  it.each([
    ['a lista', Tecnica, 'lista de exercícios'],
    ['a câmera', AnaliseTecnica, 'câmera da análise'],
  ])('libera %s quando a análise sai do desenvolvimento', async (_tela, Rota, conteudo) => {
    mockReleased = true;
    await render(<Rota />);

    expect(screen.getByText(conteudo)).toBeTruthy();
  });
});
