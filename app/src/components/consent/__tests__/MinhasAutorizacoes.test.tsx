import { SAUDE, TECNICA } from '@elevapro/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MinhasAutorizacoes } from '../MinhasAutorizacoes';

/**
 * TRAVA LGPD — a revogação existe, é alcançável, e é por finalidade.
 *
 * Art. 8°, §5°: o consentimento pode ser revogado a qualquer momento por
 * procedimento gratuito e facilitado. Antes desta tela, `revokeCollectionConsent`
 * existia no serviço e não tinha um único chamador — implementada e
 * inalcançável, que para o titular é o mesmo que não existir.
 *
 * O segundo teste é o que dá sentido à migration 0041: se revogar a Análise de
 * Técnica derrubasse junto o consentimento de saúde, a separação teria ficado
 * só no banco, e o aluno continuaria pagando com a avaliação física o preço de
 * recusar a câmera.
 */

const mockTem = jest.fn();
const mockRevogar = jest.fn();
const mockConfirmar = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createHealthService: () => ({
    hasCollectionConsent: (...args: unknown[]) => mockTem(...args),
    revokeCollectionConsent: (...args: unknown[]) => mockRevogar(...args),
  }),
}));

jest.mock('@/components/ui/appAlert', () => ({
  showAlert: jest.fn(),
  showConfirm: (opcoes: { onConfirm: () => void }) => mockConfirmar(opcoes),
}));

beforeEach(() => {
  mockTem.mockReset();
  mockRevogar.mockReset().mockResolvedValue(undefined);
  mockConfirmar.mockReset();
});

describe('Minhas autorizações', () => {
  it('oferece um caminho de revogação para quem autorizou', async () => {
    mockTem.mockResolvedValue(true);

    render(<MinhasAutorizacoes studentId="aluno-1" />);

    const botoes = await screen.findAllByText('Retirar autorização');
    if (botoes.length !== 2) {
      throw new Error(
        `REVOGAÇÃO INALCANÇÁVEL: ${botoes.length} de 2 finalidades oferecem retirada — o Art. 8°, §5° exige procedimento facilitado para cada uma`
      );
    }
  });

  it('revoga só a finalidade escolhida, sem derrubar a outra', async () => {
    mockTem.mockResolvedValue(true);

    render(<MinhasAutorizacoes studentId="aluno-1" />);
    const botoes = await screen.findAllByText('Retirar autorização');

    // O segundo cartão é a Análise de Técnica, na ordem do catálogo.
    fireEvent.press(botoes[1]);
    mockConfirmar.mock.calls[0][0].onConfirm();

    await waitFor(() => expect(mockRevogar).toHaveBeenCalled());

    const finalidade = mockRevogar.mock.calls[0][1];
    if (finalidade?.tipo !== TECNICA.tipo) {
      throw new Error(
        `FINALIDADE ERRADA REVOGADA: o aluno pediu para retirar a Análise de Técnica e o app retirou "${finalidade?.tipo}" (Art. 8°, §4°)`
      );
    }
    expect(mockRevogar).toHaveBeenCalledTimes(1);
  });

  // Confirmação não é cerimônia aqui: revogar interrompe um tratamento em
  // curso, e um toque acidental deixaria o aluno sem entender por que o app
  // parou de contar.
  it('não revoga nada antes de o aluno confirmar', async () => {
    mockTem.mockResolvedValue(true);

    render(<MinhasAutorizacoes studentId="aluno-1" />);
    const botoes = await screen.findAllByText('Retirar autorização');

    fireEvent.press(botoes[0]);

    expect(mockConfirmar).toHaveBeenCalled();
    expect(mockRevogar).not.toHaveBeenCalled();
  });

  it('consulta as duas finalidades separadamente', async () => {
    mockTem.mockResolvedValue(false);

    render(<MinhasAutorizacoes studentId="aluno-1" />);

    await waitFor(() => expect(mockTem).toHaveBeenCalledTimes(2));

    const tipos = mockTem.mock.calls.map((c) => (c[1] as { tipo: string })?.tipo);
    expect(tipos).toEqual([SAUDE.tipo, TECNICA.tipo]);
  });
});
