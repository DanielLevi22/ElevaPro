import { fireEvent, render } from '@testing-library/react-native';
import { Switch as SwitchNativo } from 'react-native';
import { coresDoTema } from '@/shared/design';
import { Avatar } from '../Avatar';
import { Row } from '../Row';
import { StatusBadge } from '../StatusBadge';
import { Switch } from '../Switch';

/**
 * Vale aqui a mesma divisão de `primitivas.test.tsx`: cor vinda de `className`
 * não é observável sob o Jest, então o que se prova é comportamento e a cor que
 * o componente resolve à mão.
 */

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
const claro = coresDoTema('claro');

beforeEach(() => {
  mockEsquema = 'dark';
});

describe('StatusBadge', () => {
  it.each([
    ['active', 'Ativo'],
    ['draft', 'Rascunho'],
    ['completed', 'Concluído'],
    ['pending', 'Pendente'],
    ['canceled', 'Cancelado'],
  ])('traduz "%s" para "%s"', (status, rotulo) => {
    const { queryByText } = render(<StatusBadge status={status} />);

    expect(queryByText(rotulo)).not.toBeNull();
  });

  it('mostra estado desconhecido cru, em vez de sumir com ele', () => {
    // Valor fora da lista vindo do banco é informação, não motivo para tela
    // em branco nem para um selo mentindo "Ativo".
    const { queryByText } = render(<StatusBadge status="arquivado_em_2024" />);

    expect(queryByText('arquivado_em_2024')).not.toBeNull();
  });
});

describe('Row', () => {
  it('anuncia se está escolhida, para o leitor de tela e não só para o olho', () => {
    const { getByRole } = render(
      <Row icon="barbell" title="Sou Especialista" selected onPress={jest.fn()} />
    );

    expect(getByRole('radio').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('marca a escolha com a cor de texto de marca, que passa contraste', () => {
    // `primary` puro é o lime de fundo; sobre superfície ele não passa AA.
    const { UNSAFE_getAllByType } = render(
      <Row icon="barbell" title="Sou Especialista" selected onPress={jest.fn()} />
    );
    const icones = UNSAFE_getAllByType('Ionicons' as never);

    expect(icones.map((i) => i.props.color)).toEqual([escuro.primaryText, escuro.primaryText]);
  });

  it('apaga o ícone quando não está escolhida', () => {
    const { UNSAFE_getAllByType } = render(
      <Row icon="barbell" title="Sou Especialista" onPress={jest.fn()} />
    );
    const icones = UNSAFE_getAllByType('Ionicons' as never);

    expect(icones).toHaveLength(1);
    expect(icones[0].props.color).toBe(escuro.mutedForeground);
  });

  it('avisa o call site quando é tocada', () => {
    const aoTocar = jest.fn();
    const { getByRole } = render(<Row icon="barbell" title="Sou Especialista" onPress={aoTocar} />);

    fireEvent.press(getByRole('button'));
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it('omite o subtítulo quando não recebe um', () => {
    const { queryByText } = render(
      <Row icon="barbell" title="Sou Especialista" onPress={jest.fn()} />
    );

    expect(queryByText('Personal trainer ou nutricionista')).toBeNull();
  });

  it('só é rádio quando a escolha está em jogo — navegar não é escolher', () => {
    // Sem `selected`, a linha é um link: anunciá-la como rádio faria o leitor
    // de tela prometer uma escolha que a tela não oferece. `disabled` sempre
    // aparece no estado porque o React Native o injeta; `selected`, não.
    const { getByRole } = render(<Row icon="person-outline" title="Perfil" chevron />);

    expect(getByRole('button').props.accessibilityState.selected).toBeUndefined();
  });

  it('não finge ser tocável quando não recebe ação', () => {
    const { getByRole } = render(<Row icon="moon" title="Tema" />);

    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  it('põe a seta na cor discreta, e não na de texto', () => {
    const { UNSAFE_getAllByType } = render(<Row icon="person-outline" title="Perfil" chevron />);
    const seta = UNSAFE_getAllByType('Ionicons' as never)[1];

    expect(seta.props.name).toBe('chevron-forward');
    expect(seta.props.color).toBe(escuro.placeholder);
  });

  it('aceita controle à direita, como a chave de uma preferência', () => {
    const { UNSAFE_getByType } = render(
      <Row icon="moon" title="Tema escuro" trailing={<Switch checked onChange={jest.fn()} />} />
    );

    expect(UNSAFE_getByType(SwitchNativo)).toBeTruthy();
  });
});

describe('Avatar', () => {
  it.each([
    ['Ana Paula Silva', 'AS'],
    ['Ana', 'A'],
    ['  ', '?'],
  ])('reduz "%s" a "%s"', (nome, esperado) => {
    // Primeiro e último nome, não as duas primeiras palavras: quem se apresenta
    // com nome composto vira "AS", e não "AP".
    const { queryByText } = render(<Avatar name={nome} />);

    expect(queryByText(esperado)).not.toBeNull();
  });

  it('mostra a foto no lugar das iniciais quando existe uma', () => {
    const { queryByText } = render(<Avatar name="Ana Silva" src="https://exemplo/ana.jpg" />);

    expect(queryByText('AS')).toBeNull();
  });

  it('só mostra o ponto de presença quando está online', () => {
    const { queryByLabelText, rerender } = render(<Avatar name="Ana" />);
    expect(queryByLabelText('online')).toBeNull();

    rerender(<Avatar name="Ana" online />);
    expect(queryByLabelText('online')).not.toBeNull();
  });
});

describe('Switch', () => {
  it('usa a chave nativa, para não perder gesto e leitor de tela', () => {
    const { UNSAFE_getByType } = render(<Switch checked={false} onChange={jest.fn()} />);

    expect(UNSAFE_getByType(SwitchNativo)).toBeTruthy();
  });

  it('pinta o trilho ligado com o primário do tema ativo', () => {
    const { UNSAFE_getByType, rerender } = render(<Switch checked onChange={jest.fn()} />);
    expect(UNSAFE_getByType(SwitchNativo).props.trackColor.true).toBe(escuro.primary);

    mockEsquema = 'light';
    rerender(<Switch checked onChange={jest.fn()} />);
    expect(UNSAFE_getByType(SwitchNativo).props.trackColor.true).toBe(claro.primary);
  });

  it('entrega o próximo valor ao call site', () => {
    const aoMudar = jest.fn();
    const { UNSAFE_getByType } = render(<Switch checked={false} onChange={aoMudar} />);

    fireEvent(UNSAFE_getByType(SwitchNativo), 'valueChange', true);
    expect(aoMudar).toHaveBeenCalledWith(true);
  });
});
