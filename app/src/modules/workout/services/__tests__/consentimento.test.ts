import { POLICY_VERSION } from '@elevapro/shared';
import { vitalsIfConsented } from '../consentimento';

// Mock global de jest.setup.ts: o serviço de saúde do `shared` recebe este cliente.
const { mockSupabase } = global as unknown as {
  mockSupabase: jest.Mock & { from: jest.Mock };
};

function consentWas(given: boolean) {
  mockSupabase.from.mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: given
        ? { given_at: '2026-08-01T00:00:00Z', revoked_at: null, policy_version: POLICY_VERSION }
        : null,
      error: null,
    }),
  }));
}

const VITALS = { avgHeartRate: 151, zones: null };

beforeEach(() => jest.clearAllMocks());

describe('batimento da sessão de cardio', () => {
  // LGPD, Art. 11, I. Sem consentimento vigente o app não grava a FC — e também não
  // a lê do relógio: ler para descartar ainda é tratar dado de saúde. O portão
  // vem antes da leitura, e não depois dela.
  it('sem consentimento, o relógio nem é lido', async () => {
    consentWas(false);
    const readWatch = jest.fn().mockResolvedValue(VITALS);

    const vitals = await vitalsIfConsented('s1', readWatch);

    if (readWatch.mock.calls.length > 0) {
      throw new Error('SAÚDE LIDA SEM CONSENTIMENTO: o relógio foi consultado antes do portão');
    }
    expect(vitals).toBeNull();
  });

  it('com consentimento, devolve o que o relógio mediu', async () => {
    consentWas(true);

    await expect(vitalsIfConsented('s1', async () => VITALS)).resolves.toEqual(VITALS);
  });

  it('falha na leitura do relógio não derruba a sessão', async () => {
    consentWas(true);

    await expect(
      vitalsIfConsented('s1', async () => {
        throw new Error('health connect indisponível');
      })
    ).resolves.toBeNull();
  });
});
