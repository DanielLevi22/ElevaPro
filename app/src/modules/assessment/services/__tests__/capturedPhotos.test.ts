import { discardPhotos, sweepLeftoverPhotos } from '../capturedPhotos';

const mockDeleteAsync = jest.fn();
const mockReadDirectoryAsync = jest.fn();
const mockRegistrarFalha = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
}));
jest.mock('@/lib/registro', () => ({
  registrarFalha: (...args: unknown[]) => mockRegistrarFalha(...args),
}));

const FOTO = 'file:///cache/body-scan-1789212345678.jpg';

function apagados(): unknown[] {
  return mockDeleteAsync.mock.calls.map(([uri]) => uri);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteAsync.mockResolvedValue(undefined);
  mockReadDirectoryAsync.mockResolvedValue([]);
});

describe('discardPhotos', () => {
  it('apaga cada foto dada, sem lançar por arquivo que já sumiu', async () => {
    await discardPhotos([FOTO, undefined, 'file:///cache/body-scan-2.jpg']);

    expect(apagados()).toEqual([FOTO, 'file:///cache/body-scan-2.jpg']);
    expect(mockDeleteAsync).toHaveBeenCalledWith(FOTO, { idempotent: true });
  });

  it('uma falha não impede as outras', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error('EACCES'));

    await expect(discardPhotos([FOTO, 'file:///cache/body-scan-2.jpg'])).resolves.toBeUndefined();
    expect(apagados()).toHaveLength(2);
  });

  // LGPD, Art. 6°, VII. O nome do arquivo marca o instante em que a pessoa se
  // fotografou de corpo inteiro, e o erro do sistema de arquivos repete o
  // caminho. O log diz que falhou, nunca o quê.
  it('a falha ao apagar não leva o caminho da foto ao log', async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error(`não apaguei ${FOTO}`));

    await discardPhotos([FOTO]);

    const registrado = JSON.stringify(mockRegistrarFalha.mock.calls);
    if (registrado.includes('body-scan-1789212345678')) {
      throw new Error(`CAMINHO DA FOTO NO LOG: ${registrado}`);
    }
    expect(mockRegistrarFalha).toHaveBeenCalledWith('body_scan.discard_photo');
  });
});

describe('sweepLeftoverPhotos', () => {
  // LGPD, Art. 16. O store não é persistido: se o sistema mata o app no meio do
  // scan, só o nome do arquivo ainda leva à foto. Sem a varredura ela fica no
  // aparelho, em claro, até a próxima limpeza do sistema operacional.
  it('começar um scan apaga as fotos de um scan interrompido', async () => {
    mockReadDirectoryAsync.mockResolvedValue([
      'body-scan-1789212345678.jpg',
      'body-scan-1789212399999.jpg',
      'pose_landmarker_lite.task',
      'relatorio-do-periodo.pdf',
    ]);

    await sweepLeftoverPhotos();

    const restantes = ['body-scan-1789212345678.jpg', 'body-scan-1789212399999.jpg'].filter(
      (nome) => !apagados().includes(`file:///cache/${nome}`)
    );
    if (restantes.length > 0) {
      throw new Error(`FOTO DO CORPO FICOU NO APARELHO: ${restantes.join(', ')}`);
    }
  });

  it('não apaga o que não é foto do scan', async () => {
    mockReadDirectoryAsync.mockResolvedValue([
      'pose_landmarker_lite.task',
      'body-scan-notas.jpg.bak',
      'relatorio-do-periodo.pdf',
    ]);

    await sweepLeftoverPhotos();

    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('cache ilegível não derruba o começo do scan', async () => {
    mockReadDirectoryAsync.mockRejectedValue(new Error('ENOENT'));

    await expect(sweepLeftoverPhotos()).resolves.toBeUndefined();
    expect(mockRegistrarFalha).toHaveBeenCalledWith('body_scan.sweep_photos');
  });
});
