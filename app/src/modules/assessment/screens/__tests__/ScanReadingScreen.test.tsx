import type { BodyScanRecord } from '@elevapro/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ScanReadingScreen } from '../ScanReadingScreen';

/**
 * A leitura da análise (#316, tela 6). Herda o que o teste da `PostureAnalysis`
 * guardava: a tela não inventa índice, diz que as notas não são medida, diz o
 * que ela não é, e mostra o que a análise escreveu — não um texto fixo.
 */

const mockList = jest.fn();
const mockDeleteOwn = jest.fn();
const mockBack = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createBodyScanService: () => ({
    list: (...args: unknown[]) => mockList(...args),
    deleteOwn: (...args: unknown[]) => mockDeleteOwn(...args),
  }),
}));

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ back: mockBack, push: jest.fn() }),
    // Sob o Jest não há navegador para dar foco: roda como efeito de montagem.
    useFocusEffect: (callback: () => undefined) => useEffect(callback, [callback]),
  };
});

const ANALISE = {
  id: 'scan-1',
  student_id: 'aluno-1',
  scanned_at: '2026-08-12T15:00:00Z',
  scale_source: 'assessment',
  weight_kg: 78.4,
  body_fat_pct: 17.2,
  posture_symmetry_score: 62,
  posture_muscle_score: 74,
  posture_overall_score: 88,
  posture_feedback: {
    front: [{ title: 'Ombros', risk: 'MODERADO', text: 'Leve elevação à direita.' }],
    side: [{ title: 'Lordose', risk: 'NORMAL', text: 'Curva dentro do esperado.' }],
  },
  recommendations: 'Priorize trabalho unilateral por seis semanas.',
  framing_camera: 'back',
  quality_backlit: false,
  quality_low_light: false,
  quality_blown_out: false,
  framing_confirmed: true,
  trunk_rotated: false,
} as unknown as BodyScanRecord;

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([ANALISE]);
  mockDeleteOwn.mockResolvedValue(undefined);
});

async function abrir() {
  render(<ScanReadingScreen studentId="aluno-1" scanId="scan-1" />);
  await screen.findByText('Leitura das fotos');
}

describe('ScanReadingScreen', () => {
  // A média de 62, 74 e 88 — 75 — já foi um "Athletic Score" no maior
  // destaque da tela. Nada ali era medido.
  it('não inventa um índice a partir das notas', async () => {
    await abrir();

    expect(screen.queryByText('75')).toBeNull();
    expect(screen.queryByText(/athletic score/i)).toBeNull();
  });

  it('diz que as notas são estimativa, e o que a análise não é', async () => {
    await abrir();

    expect(screen.getByText('Não são medidas')).toBeTruthy();
    expect(screen.getByText(/não substituem avaliação física presencial/i)).toBeTruthy();
    expect(screen.getByText(/não são diagnóstico/i)).toBeTruthy();
  });

  it('mostra os achados das três vistas e a recomendação da análise', async () => {
    await abrir();

    expect(screen.getByText('Leve elevação à direita.')).toBeTruthy();
    expect(screen.getByText('Curva dentro do esperado.')).toBeTruthy();
    expect(screen.getByText('Atenção')).toBeTruthy();
    expect(screen.getByText(/trabalho unilateral por seis semanas/i)).toBeTruthy();
  });

  it('o selo de confiança vem da própria captura', async () => {
    await abrir();

    expect(screen.getByText('Captura confiável')).toBeTruthy();
  });

  // LGPD, Art. 18, VI: apagar tem botão, e o botão pede confirmação antes.
  it('apaga a análise só depois de confirmar', async () => {
    await abrir();

    fireEvent.press(screen.getByLabelText('Apagar esta análise'));
    expect(mockDeleteOwn).not.toHaveBeenCalled();

    fireEvent.press(await screen.findByText('Apagar análise'));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockDeleteOwn).toHaveBeenCalledWith('scan-1');
  });

  it('análise que não está na lista não vira tela em branco', async () => {
    mockList.mockResolvedValue([]);
    render(<ScanReadingScreen studentId="aluno-1" scanId="scan-1" />);

    expect(await screen.findByText('Análise não encontrada')).toBeTruthy();
  });
});
