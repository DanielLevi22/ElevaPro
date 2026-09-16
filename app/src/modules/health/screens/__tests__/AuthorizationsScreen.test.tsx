import { type ConsentStatus, RANKING, SAUDE, TECNICA } from '@elevapro/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthorizationsScreen } from '../AuthorizationsScreen';

/**
 * TRAVA LGPD — a retirada existe, é alcançável, e é por finalidade.
 *
 * Art. 8°, §5°: o consentimento se revoga a qualquer momento por procedimento
 * gratuito e facilitado. Antes de Minhas autorizações, `revokeCollectionConsent`
 * existia no serviço e não tinha um único chamador — implementada e inalcançável,
 * que para o titular é o mesmo que não existir.
 *
 * O segundo teste é o que dá sentido à migration 0041: se retirar a Análise de
 * Técnica derrubasse junto o aceite de saúde, a separação teria ficado só no banco,
 * e o Student pagaria com a avaliação física o preço de recusar a câmera.
 */

const mockStatus = jest.fn();
const mockRevoke = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createHealthService: () => ({
    getConsentStatus: (...args: unknown[]) => mockStatus(...args),
    revokeCollectionConsent: (...args: unknown[]) => mockRevoke(...args),
  }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

const GRANTED: ConsentStatus = {
  state: 'granted',
  givenAt: '2026-08-28T10:00:00Z',
  policyVersion: '1.7',
};

function renderScreen() {
  // `gcTime` infinito: o coletor agenda um timer por consulta, e o Jest não sai.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthorizationsScreen studentId="aluno-1" hasSpecialist />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockStatus.mockReset().mockResolvedValue(GRANTED);
  mockRevoke.mockReset().mockResolvedValue(undefined);
});

describe('Minhas autorizações', () => {
  it('oferece um caminho de retirada para cada finalidade autorizada', async () => {
    renderScreen();

    const links = await screen.findAllByLabelText(
      /^Retirar (Dados de saúde|Análise de Técnica|Ranking)$/
    );
    if (links.length !== 3) {
      throw new Error(
        `REVOGAÇÃO INALCANÇÁVEL: ${links.length} de 3 finalidades oferecem retirada — o Art. 8°, §5° exige procedimento facilitado para cada uma`
      );
    }
  });

  it('retira só a finalidade escolhida, sem derrubar a outra', async () => {
    renderScreen();

    fireEvent.press(await screen.findByLabelText('Retirar Análise de Técnica'));
    fireEvent.press(screen.getByLabelText('Confirmar retirada'));

    await waitFor(() => expect(mockRevoke).toHaveBeenCalled());
    const purpose = mockRevoke.mock.calls[0][1];
    if (purpose?.tipo !== TECNICA.tipo) {
      throw new Error(
        `FINALIDADE ERRADA REVOGADA: o aluno pediu para retirar a Análise de Técnica e o app retirou "${purpose?.tipo}" (Art. 8°, §4°)`
      );
    }
    expect(mockRevoke).toHaveBeenCalledTimes(1);
  });

  it('não retira nada antes de o Student confirmar na folha', async () => {
    renderScreen();

    fireEvent.press(await screen.findByLabelText('Retirar Dados de saúde'));

    expect(screen.getByText('O que muda agora')).toBeTruthy();
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('consulta as três finalidades separadamente', async () => {
    renderScreen();

    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(3));
    const types = mockStatus.mock.calls.map((call) => (call[1] as { tipo: string })?.tipo);
    expect(types.sort()).toEqual([SAUDE.tipo, TECNICA.tipo, RANKING.tipo].sort());
  });
});
