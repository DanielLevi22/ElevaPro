import { fireEvent, render } from '@testing-library/react-native';
import { coresDoTema } from '@/shared/design';
import { ConfirmModal } from '../ConfirmModal';
import { ProgressCard } from '../ProgressCard';
import { StatCard } from '../StatCard';

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

describe('StatCard', () => {
  it('esconde a variação quando falta a direção ou o número', () => {
    // Uma seta sem valor, ou um valor sem direção, informa menos que nada.
    const { queryByText, rerender } = render(<StatCard label="Passos" value="8.412" trend="up" />);
    expect(queryByText('84%')).toBeNull();

    rerender(<StatCard label="Passos" value="8.412" change="84%" />);
    expect(queryByText('84%')).toBeNull();

    rerender(<StatCard label="Passos" value="8.412" trend="up" change="84%" />);
    expect(queryByText('84%')).not.toBeNull();
  });

  it.each([
    ['up', 'arrow-up'],
    ['down', 'arrow-down'],
    ['neutral', 'remove'],
  ] as const)('aponta a seta de %s para %s', (trend, icone) => {
    const { UNSAFE_getAllByType } = render(
      <StatCard label="Passos" value="1" trend={trend} change="1%" />
    );

    expect(UNSAFE_getAllByType('Ionicons' as never)[0].props.name).toBe(icone);
  });

  it('pinta a queda com a cor de erro, e não com a de sucesso', () => {
    const { UNSAFE_getAllByType } = render(
      <StatCard label="Passos" value="1" trend="down" change="12%" />
    );

    expect(UNSAFE_getAllByType('Ionicons' as never)[0].props.color).toBe(escuro.destructive);
  });

  it('mostra valor numérico sem exigir que a tela o formate antes', () => {
    const { queryByText } = render(<StatCard label="Séries" value={12} />);

    expect(queryByText('12')).not.toBeNull();
  });
});

describe('ProgressCard', () => {
  const larguraDaBarra = (arvore: ReturnType<typeof render>) =>
    arvore.getByRole('progressbar').props.children.props.style.width;

  it('anuncia o progresso ao leitor de tela, e não só à vista', () => {
    const { getByRole } = render(<ProgressCard title="Refeições" current={2} target={5} />);

    expect(getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 5, now: 2 });
  });

  it('preenche a barra na proporção da meta', () => {
    expect(larguraDaBarra(render(<ProgressCard title="X" current={2} target={5} />))).toBe('40%');
  });

  it('trata meta zerada como cumprida, e não como divisão por zero', () => {
    // "0 de 0 refeições" é meta cumprida, não erro de exibição.
    expect(larguraDaBarra(render(<ProgressCard title="X" current={0} target={0} />))).toBe('100%');
  });

  it('não deixa a barra passar do fim quando a pessoa excede a meta', () => {
    expect(larguraDaBarra(render(<ProgressCard title="X" current={9} target={5} />))).toBe('100%');
  });

  it('mostra a fração com a unidade quando recebe uma', () => {
    const { queryByText } = render(
      <ProgressCard title="Treino" current={1} target={1} unit="treino" />
    );

    expect(queryByText('1/1 treino')).not.toBeNull();
  });
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
