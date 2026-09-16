import type { BodyScanRecord } from '@elevapro/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScanMeasuresScreen } from '../ScanMeasuresScreen';

const mockList = jest.fn();

jest.mock('@elevapro/shared', () => ({
  ...jest.requireActual('@elevapro/shared'),
  createBodyScanService: () => ({ list: (...args: unknown[]) => mockList(...args) }),
}));

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
    useFocusEffect: (callback: () => undefined) => useEffect(callback, [callback]),
  };
});

const SCAN = {
  id: 'scan-geometry',
  student_id: 'student-1',
  scanned_at: '2026-08-12T15:00:00Z',
  scale_source: 'assessment',
  weight_kg: 78.4,
  body_fat_pct: 17.2,
  lean_mass_kg: 64.9,
  bmi: 24.7,
  circ_chest: 104.2,
  circ_waist: 81.6,
  circ_hips: 98.4,
  shoulder_drop_cm: 1.8,
  shoulder_tilt_deg: 2,
  trunk_rotated: false,
} as unknown as BodyScanRecord;

describe('ScanMeasuresScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue([SCAN]);
  });

  // LGPD, Art. 18, II: a geometria gravada sÃ³ cumpre livre acesso se a tela
  // que o aluno alcanÃ§a a renderiza. TirÃ¡-la daqui escondia o dado tratado.
  it('nÃ£o esconde a geometria medida na tela que o aluno abre', async () => {
    render(<ScanMeasuresScreen studentId="student-1" scanId="scan-geometry" />);

    fireEvent.press(await screen.findByText('Medido no seu aparelho'));

    const shoulder = screen.queryByText(/Desn.vel dos ombros/);
    if (!shoulder) {
      throw new Error('GEOMETRIA OCULTA: o aluno perdeu acesso Ã  medida gravada');
    }
    expect(shoulder).toBeTruthy();
  });
});
