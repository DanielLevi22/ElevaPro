import { weekWeightIfConsented } from '../healthWeight';

const mockHasConsent = jest.fn();
const mockReadAverage = jest.fn();

jest.mock('@elevapro/shared', () => ({
  createHealthService: () => ({ hasCollectionConsent: (id: string) => mockHasConsent(id) }),
}));
jest.mock('@/shared/wearable', () => ({
  readWeekAverageWeight: (start: Date, end: Date) => mockReadAverage(start, end),
}));

// Quarta, 14/10/2026, 10h.
const NOW = new Date(2026, 9, 14, 10, 0);

describe('weekWeightIfConsented (F9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('com o aceite, lê a média de segunda até agora', async () => {
    mockHasConsent.mockResolvedValue(true);
    mockReadAverage.mockResolvedValue(77.7);

    expect(await weekWeightIfConsented('aluno', NOW)).toBe(77.7);
    expect(mockReadAverage).toHaveBeenCalledWith(new Date(2026, 9, 12), NOW);
  });

  // Art. 11, I: o peso do app Saúde é dado de saúde, e sem o consentimento
  // vigente ele nem é lido. Ler para descartar ainda é tratamento (§2.3).
  it('sem o consentimento de saúde, o app Saúde nem é lido', async () => {
    mockHasConsent.mockResolvedValue(false);

    expect(await weekWeightIfConsented('aluno', NOW)).toBeNull();
    if (mockReadAverage.mock.calls.length > 0) {
      throw new Error(
        'PESO LIDO SEM CONSENTIMENTO: o app Saúde foi consultado sem o aceite vigente'
      );
    }
  });

  it('falha ao conferir o aceite fecha, não abre', async () => {
    mockHasConsent.mockRejectedValue(new Error('rede'));

    expect(await weekWeightIfConsented('aluno', NOW)).toBeNull();
    expect(mockReadAverage).not.toHaveBeenCalled();
  });
});
