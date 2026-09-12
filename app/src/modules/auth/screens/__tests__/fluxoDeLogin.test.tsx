import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { showAlert } from '@/components/ui/appAlert';
import { LoginScreen } from '../LoginScreen';

/**
 * Login como fluxo, não como tela.
 *
 * Um teste de integração por fluxo crítico foi o que a #281 acordou, e ele
 * atravessa de propósito: a tela chama o store, o store chama o serviço de
 * auth, e o único mock é o cliente do Supabase — que é a borda do sistema.
 * Trocar qualquer coisa no caminho entre a tela e o Supabase quebra isto.
 *
 * Não há asserção de layout nem de cor: a tela será ajustada muitas vezes, e
 * teste que quebra a cada ajuste não paga o próprio custo.
 */

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'dark' }),
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
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/components/ui/appAlert', () => ({ showAlert: jest.fn() }));

// biome-ignore lint/suspicious/noExplicitAny: o mock global vive em `global`
const supabaseMock = (global as any).mockSupabase;
// biome-ignore lint/suspicious/noExplicitAny: idem
const builderMock = (global as any).mockSupabaseBuilder;

const avisar = showAlert as jest.Mock;

function preencherEEntrar(tela: ReturnType<typeof render>) {
  fireEvent.changeText(tela.getByPlaceholderText('seu@email.com'), 'ana@exemplo.com');
  fireEvent.changeText(tela.getByPlaceholderText('••••••••'), 'senha-boa-12');
  fireEvent.press(tela.getByLabelText('Entrar'));
}

/** Conta ativa é o caminho comum: nada barra e nada avisa. */
function comPerfil(account_status: string | null) {
  builderMock.single.mockResolvedValue({ data: { account_status }, error: null });
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user: { id: 'ana' } },
    error: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
  comPerfil('active');
});

describe('fluxo de login', () => {
  it('entrega e-mail e senha ao Supabase, na caixa em que foram digitados', async () => {
    const tela = render(<LoginScreen />);

    preencherEEntrar(tela);

    await waitFor(() =>
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'ana@exemplo.com',
        password: 'senha-boa-12',
      })
    );
  });

  it('não avisa nada quando a conta está ativa', async () => {
    const tela = render(<LoginScreen />);

    preencherEEntrar(tela);

    await waitFor(() => expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalled());
    expect(avisar).not.toHaveBeenCalled();
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
  });

  it('mostra a mensagem do servidor quando a credencial não serve', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    });
    const tela = render(<LoginScreen />);

    preencherEEntrar(tela);

    await waitFor(() =>
      expect(avisar).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid login credentials', type: 'error' })
      )
    );
  });

  it('derruba a sessão de conta desativada, mesmo com a senha certa', async () => {
    // O enum é `active | inactive | invited`. Antes se comparava com 'rejected'
    // e 'suspended', que nunca existiram: o ramo jamais executava e conta
    // desativada entrava normalmente.
    comPerfil('inactive');
    const tela = render(<LoginScreen />);

    preencherEEntrar(tela);

    await waitFor(() => expect(supabaseMock.auth.signOut).toHaveBeenCalled());
    expect(avisar).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Acesso Negado', type: 'error' })
    );
  });

  it('deixa entrar quem está `invited`, que é o aluno cadastrado pelo especialista', async () => {
    // Este estado barrava o aluno provisionado no Fluxo A: ele nasce `invited`
    // e era mandado para a fila de aprovação na primeira tentativa de entrar,
    // sem nunca conseguir acessar o app (removido na 0050).
    comPerfil('invited');
    const tela = render(<LoginScreen />);

    preencherEEntrar(tela);

    await waitFor(() => expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalled());
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
    expect(avisar).not.toHaveBeenCalled();
  });

  it('libera o botão depois da falha, para a pessoa poder tentar de novo', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Network request failed'),
    });
    const tela = render(<LoginScreen />);

    preencherEEntrar(tela);
    await waitFor(() => expect(avisar).toHaveBeenCalled());

    // Travado em "carregando" o rótulo desaparece e o toque não passa: quem
    // erra a senha uma vez ficaria preso sem saber por quê.
    expect(tela.getByLabelText('Entrar').props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
  });

  it('revela e esconde a senha pelo olho', () => {
    const tela = render(<LoginScreen />);
    const campo = tela.getByPlaceholderText('••••••••');

    expect(campo.props.secureTextEntry).toBe(true);

    fireEvent.press(tela.getByLabelText('Mostrar senha'));
    expect(tela.getByPlaceholderText('••••••••').props.secureTextEntry).toBe(false);

    fireEvent.press(tela.getByLabelText('Ocultar senha'));
    expect(tela.getByPlaceholderText('••••••••').props.secureTextEntry).toBe(true);
  });
});
