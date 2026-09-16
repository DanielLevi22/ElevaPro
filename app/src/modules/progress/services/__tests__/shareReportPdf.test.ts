import type { ReportSheet } from '../reportPdf';
import { sharePeriodReport } from '../shareReportPdf';

const mockPrintToFileAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockMoveAsync = jest.fn();

jest.mock('expo-print', () => ({
  printToFileAsync: (...args: unknown[]) => mockPrintToFileAsync(...args),
}));
jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
  isAvailableAsync: () => mockIsAvailableAsync(),
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  moveAsync: (...args: unknown[]) => mockMoveAsync(...args),
}));

const FOLHA: ReportSheet = {
  studentName: 'Ana Souza',
  period: '17 jun → 15 set 2026',
  subtitle: null,
  panel: { workouts: 34, adherence: 88, goal: 90, cardioSessions: 6, measurements: 3 },
  records: [],
  streak: { current: 12, best: 18 },
  composition: null,
  note: null,
  formatDate: (date) => date,
};

const ARQUIVO = 'file:///cache/relatorio-do-periodo.pdf';

/**
 * O arquivo foi apagado **depois** de a folha abrir.
 *
 * A checagem é pela ordem das chamadas, e não pela presença: `withReadableName`
 * apaga o arquivo do dia anterior antes de mover, e uma asserção de presença
 * passava sozinha com essa limpeza — trava que não podia falhar.
 */
function apagouDepoisDeCompartilhar(): boolean {
  const abriu = mockShareAsync.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER;
  return mockDeleteAsync.mock.calls.some(
    ([uri], index) =>
      uri === ARQUIVO && (mockDeleteAsync.mock.invocationCallOrder[index] ?? 0) > abriu
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrintToFileAsync.mockResolvedValue({ uri: 'file:///cache/Print/3f1c0a52.pdf' });
  mockIsAvailableAsync.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
  mockMoveAsync.mockResolvedValue(undefined);
});

describe('sharePeriodReport', () => {
  it('gera, renomeia e compartilha o PDF', async () => {
    await expect(sharePeriodReport(FOLHA)).resolves.toBe(true);

    expect(mockMoveAsync).toHaveBeenCalledWith({
      from: 'file:///cache/Print/3f1c0a52.pdf',
      to: ARQUIVO,
    });
    expect(mockShareAsync).toHaveBeenCalledWith(
      ARQUIVO,
      expect.objectContaining({
        mimeType: 'application/pdf',
      })
    );
  });

  // LGPD, Art. 15 + Art. 6°, VII. O arquivo tem peso, medidas e o que o
  // especialista escreveu. Deixá-lo no cache é guardar dado de saúde em claro,
  // fora do banco, esperando a próxima limpeza do sistema operacional.
  it('apaga o arquivo depois de compartilhar', async () => {
    await sharePeriodReport(FOLHA);

    if (!apagouDepoisDeCompartilhar()) {
      throw new Error('PDF DEIXADO NO APARELHO: o relatório compartilhado não foi apagado');
    }
  });

  it('apaga também quando o compartilhamento falha', async () => {
    mockShareAsync.mockRejectedValue(new Error('cancelado'));

    await expect(sharePeriodReport(FOLHA)).resolves.toBe(false);

    if (!apagouDepoisDeCompartilhar()) {
      throw new Error('PDF DEIXADO NO APARELHO: a falha ao compartilhar não apagou o arquivo');
    }
  });

  it('sem folha de compartilhar no aparelho, não deixa arquivo para trás', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(sharePeriodReport(FOLHA)).resolves.toBe(false);

    // Sem folha, nada abriu — mas o arquivo foi gerado, e some do mesmo jeito.
    const apagou = mockDeleteAsync.mock.calls.filter(([uri]) => uri === ARQUIVO);
    expect(apagou.length).toBeGreaterThan(1);
  });

  // O erro do `expo-print` carrega o caminho do arquivo e pode carregar o HTML
  // que falhou ao ser escrito — que é o relatório inteiro (Art. 6°, VII).
  it('a falha ao gerar não leva o conteúdo ao log', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPrintToFileAsync.mockRejectedValue(
      new Error('falhou ao escrever Ana Souza 88% 34 treinos')
    );

    await expect(sharePeriodReport(FOLHA)).resolves.toBe(false);

    const registrado = error.mock.calls.flat().map(String).join(' ');
    error.mockRestore();
    if (/Ana Souza|88|34 treinos/.test(registrado)) {
      throw new Error(`RELATÓRIO NO LOG: ${registrado}`);
    }
  });
});
