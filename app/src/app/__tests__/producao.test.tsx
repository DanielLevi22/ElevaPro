import { render } from '@testing-library/react-native';
import SpikeTecnica from '../spike-tecnica';

/**
 * TRAVA: a tela de Análise de Técnica não é alcançável em build de produção.
 *
 * É esta trava que permite às fases 2 e 3 da issue #194 serem trabalho em vez
 * de portão. Enquanto ela vale, nenhum aluno chega à câmera — então o
 * consentimento da `POLICY_VERSION` 1.3, que ainda não existe, não está sendo
 * contornado por ninguém. No dia em que ela cair sem que a fase 2 esteja
 * verde, o app passa a processar a imagem do corpo de alguém sem base legal.
 *
 * Processar imagem do corpo já é tratamento pelo Art. 5°, X — não guardar não
 * é não tratar. Foi esse raciocínio que obrigou a `POLICY_VERSION` 1.2 quando
 * o body scan passou a amostrar a cada dois segundos.
 *
 * **Provas negativas, as duas verificadas em 2026-09-03:**
 *
 * 1. Removido o `if (!__DEV__)` de `spike-tecnica.tsx`, os dois primeiros
 *    testes falham e o terceiro segue passando.
 * 2. Devolvido o `if` para **depois** dos hooks, que era onde ele estava,
 *    "não desenha nada" volta a passar e só "não toca na câmera" falha — que
 *    é exatamente a diferença entre invisível e inativa.
 */

const mockKeepAwake = jest.fn();
const mockPedirCamera = jest.fn();

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: () => mockKeepAwake(),
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => {
    mockPedirCamera();
    return [{ granted: true }, jest.fn()];
  },
}));

jest.mock('../../../modules/technique-spike', () => ({
  TechniqueSpikeView: () => null,
}));

/**
 * Release, não desenvolvimento. Nos testes o `__DEV__` do React Native é
 * `true`, e sem desligá-lo estaríamos afirmando o contrário do que interessa.
 */
function comoEmRelease<T>(fn: () => T): T {
  const global_ = globalThis as { __DEV__?: boolean };
  const antes = global_.__DEV__;
  global_.__DEV__ = false;
  try {
    return fn();
  } finally {
    global_.__DEV__ = antes;
  }
}

beforeEach(() => {
  mockKeepAwake.mockClear();
  mockPedirCamera.mockClear();
});

describe('Análise de Técnica em build de produção', () => {
  it('não desenha nada', () => {
    const { toJSON } = comoEmRelease(() => render(<SpikeTecnica />));

    expect(toJSON()).toBeNull();
  });

  // Não basta não desenhar: o portão precisa vir antes dos hooks. Com ele
  // depois, a tela devolvia `null` e mesmo assim já tinha pedido a câmera e
  // ligado o keep-awake — invisível e ativa é o pior dos dois mundos.
  it('não toca na câmera nem segura a tela acesa', () => {
    comoEmRelease(() => render(<SpikeTecnica />));

    expect(mockPedirCamera).not.toHaveBeenCalled();
    expect(mockKeepAwake).not.toHaveBeenCalled();
  });

  // O contraste que dá sentido aos dois acima: em desenvolvimento a tela
  // monta de verdade. Sem isto, um `return null` incondicional passaria.
  it('em desenvolvimento, monta e usa a câmera', () => {
    render(<SpikeTecnica />);

    expect(mockPedirCamera).toHaveBeenCalled();
    expect(mockKeepAwake).toHaveBeenCalled();
  });
});
