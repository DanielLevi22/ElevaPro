import { measureCapturedPhoto } from '../measuredCapture';

const mockDeleteAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

const URI = 'file:///cache/body-scan-123.jpg';

describe('measureCapturedPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAsync.mockResolvedValue(undefined);
  });

  // LGPD, Art. 6Â°, III e Art. 16: uma foto cuja geometria falhou nÃ£o entra no
  // store; sem este descarte ela ficaria no cache sem Refazer ou sucesso alcanÃ§arem.
  it('nÃ£o deixa no aparelho a foto rejeitada pela mediÃ§Ã£o', async () => {
    const result = await measureCapturedPhoto(
      URI,
      false,
      { measure: async () => null },
      {
        manualFallback: false,
      }
    );

    expect(result).toBeNull();
    expect(mockDeleteAsync).toHaveBeenCalledWith(URI, { idempotent: true });
  });

  it('mantÃ©m a foto sem geometria sÃ³ na saÃ­da manual', async () => {
    await measureCapturedPhoto(URI, true, { measure: async () => null }, { manualFallback: true });

    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('mantÃ©m a foto medida para o store aceitar', async () => {
    const measurement = { shoulderCenterX: 0.5 } as never;
    await expect(
      measureCapturedPhoto(
        URI,
        false,
        { measure: async () => measurement },
        { manualFallback: false }
      )
    ).resolves.toBe(measurement);
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });
});
