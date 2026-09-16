import { render, waitFor } from '@testing-library/react-native';
import { AnaliseDeTecnicaScreen } from '../screens/AnaliseDeTecnicaScreen';

/**
 * TRAVA LGPD — a câmera não abre sem consentimento válido da finalidade.
 *
 * Art. 11, I. Análise de Técnica lê a imagem do corpo continuamente, e isso é
 * tratamento de dado sensível pelo Art. 5°, X mesmo sem armazenar nada. A base
 * legal exige consentimento **específico da finalidade** (Art. 8°, §4°): o do
 * body scan não serve, e é por isso que a migration 0041 criou o
 * `technique_analysis` em vez de subir a política do outro.
 *
 * O que esta trava protege é a ORDEM. A view nativa abre a câmera no `init`
 * dela, então montá-la antes de perguntar já teria processado a imagem de quem
 * não autorizou — e aí não há como desfazer.
 */

const mockTemConsentimento = jest.fn();
const mockCameraAberta = jest.fn();

jest.mock('../../../../modules/technique-spike', () => ({
  TechniqueSpikeView: (props: unknown) => {
    mockCameraAberta(props);
    return null;
  },
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createHealthService: () => ({
    hasCollectionConsent: (...args: unknown[]) => mockTemConsentimento(...args),
    grantCollectionConsent: jest.fn(),
  }),
}));

jest.mock('@/auth', () => ({
  useAuthStore: (seletor: (s: unknown) => unknown) =>
    seletor({ session: { user: { id: 'aluno-1' } } }),
}));

beforeEach(() => {
  mockCameraAberta.mockClear();
  mockTemConsentimento.mockReset();
});

describe('Análise de Técnica — consentimento antes da câmera', () => {
  it('não abre a câmera de quem não autorizou', async () => {
    mockTemConsentimento.mockResolvedValue(false);

    render(<AnaliseDeTecnicaScreen />);

    await waitFor(() => expect(mockTemConsentimento).toHaveBeenCalled());

    if (mockCameraAberta.mock.calls.length > 0) {
      throw new Error(
        'IMAGEM DO CORPO PROCESSADA SEM AUTORIZAÇÃO: a view nativa montou antes do consentimento (Art. 11, I)'
      );
    }
  });

  it('não abre a câmera enquanto a autorização ainda está sendo consultada', () => {
    mockTemConsentimento.mockReturnValue(new Promise(() => {}));

    render(<AnaliseDeTecnicaScreen />);

    if (mockCameraAberta.mock.calls.length > 0) {
      throw new Error(
        'IMAGEM DO CORPO PROCESSADA SEM AUTORIZAÇÃO: a view nativa montou durante a consulta, antes de haver resposta (Art. 11, I)'
      );
    }
  });

  // Falha de rede não é autorização. Tratar erro como "concedido" abriria a
  // câmera exatamente no momento em que não se sabe se pode.
  it('não abre a câmera quando a consulta de autorização falha', async () => {
    mockTemConsentimento.mockRejectedValue(new Error('rede fora'));

    render(<AnaliseDeTecnicaScreen />);

    await waitFor(() => expect(mockTemConsentimento).toHaveBeenCalled());

    if (mockCameraAberta.mock.calls.length > 0) {
      throw new Error(
        'IMAGEM DO CORPO PROCESSADA SEM AUTORIZAÇÃO: erro de consulta foi tratado como permissão (Art. 11, I)'
      );
    }
  });

  // O par que dá sentido aos três acima: afirmar só a ausência passaria com uma
  // tela que nunca abre a câmera para ninguém.
  it('abre a câmera de quem autorizou', async () => {
    mockTemConsentimento.mockResolvedValue(true);

    render(<AnaliseDeTecnicaScreen />);

    await waitFor(() => expect(mockCameraAberta).toHaveBeenCalled());
  });

  it('consulta a autorização da finalidade da técnica, não a do body scan', async () => {
    mockTemConsentimento.mockResolvedValue(true);

    render(<AnaliseDeTecnicaScreen />);

    await waitFor(() => expect(mockTemConsentimento).toHaveBeenCalled());

    const purpose = mockTemConsentimento.mock.calls[0][1] as { type: string };
    if (purpose?.type !== 'technique_analysis') {
      throw new Error(
        `AUTORIZAÇÃO GENÉRICA: a tela aceitou o consentimento "${purpose?.type}" para uma finalidade que não é a dele (Art. 8°, §4°)`
      );
    }
  });
});
