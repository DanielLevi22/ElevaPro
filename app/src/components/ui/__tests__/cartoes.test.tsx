import { fireEvent, render } from '@testing-library/react-native';
import { coresDoTema } from '@/shared/design';
import { ConfirmModal } from '../ConfirmModal';

let mockEsquema: 'light' | 'dark' = 'dark';

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: mockEsquema }),
  colorScheme: { set: jest.fn() },
}));

/**
 * A janela fica fixa na largura do desenho (390pt) para o teste afirmar as
 * medidas do desenho, e não o resultado do fator de escala do aparelho de quem
 * roda a suíte. O fator em si tem teste próprio, em `tokens.test.ts`.
 */
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 800, scale: 3, fontScale: 1 }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const escuro = coresDoTema('escuro');

beforeEach(() => {
  mockEsquema = 'dark';
});

describe('ConfirmModal', () => {
  const abrir = (props: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) =>
    render(
      <ConfirmModal
        visible
        title="Apagar treino?"
        message="Isso não pode ser desfeito."
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        {...props}
      />
    );

  it('fecha sozinho depois de confirmar, sem o call site precisar lembrar', () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const { getByText } = abrir({ onClose, onConfirm });

    fireEvent.press(getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('o secundário só fecha quando não recebe ação própria', () => {
    const onClose = jest.fn();
    const { getByText } = abrir({ onClose });

    fireEvent.press(getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chama a ação do secundário quando ela existe, e fecha depois', () => {
    // O secundário nem sempre é "Cancelar": ao fim do treino ele é "Sair"
    // contra "Compartilhar", e aí a intenção não se infere do fechamento.
    const onCancel = jest.fn();
    const onClose = jest.fn();
    const { getByText } = abrir({ onCancel, onClose, cancelText: 'Sair' });

    fireEvent.press(getByText('Sair'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('usa a ação destrutiva só quando o tipo é de perigo', () => {
    const { getByLabelText } = abrir({ type: 'danger', confirmText: 'Apagar' });

    expect(getByLabelText('Apagar')).toBeTruthy();
  });

  it.each([
    ['danger', 'destructive'],
    ['warning', 'warning'],
    ['success', 'success'],
    ['info', 'secondary'],
  ] as const)('pinta o ícone de %s com a cor de %s', (type, token) => {
    const { UNSAFE_getAllByType } = abrir({ type });

    expect(UNSAFE_getAllByType('Ionicons' as never)[0].props.color).toBe(escuro[token]);
  });
});
