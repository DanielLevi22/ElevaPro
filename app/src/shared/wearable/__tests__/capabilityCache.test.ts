import {
  clearCapabilityReport,
  readCapabilityReport,
  saveCapabilityReport,
} from '../capabilityCache';
import type { CapabilityReport } from '../types';

// O `jest.setup` troca o MMKV por um stub que não guarda nada. Aqui o que se testa
// é justamente o que fica guardado, então o armazenamento precisa lembrar.
// O mapa é o que o aparelho guardaria: é nele que a trava de minimização olha.
const mockDeviceMemory = new Map<string, string>();
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockDeviceMemory.get(key),
    set: (key: string, value: string) => mockDeviceMemory.set(key, value),
    remove: (key: string) => mockDeviceMemory.delete(key),
  }),
}));

const CHECKED_AT = new Date('2026-09-14T12:00:00.000Z');

const REPORT: CapabilityReport = {
  dailyActivity: 'available',
  sleepAndRestingHr: 'unavailable',
  workoutHeartRate: 'unknown',
};

beforeEach(() => clearCapabilityReport());

describe('cache de capacidades no aparelho', () => {
  it('guarda o relatório com a hora da verificação', () => {
    saveCapabilityReport(REPORT, CHECKED_AT);

    expect(readCapabilityReport()).toEqual({ report: REPORT, checkedAt: CHECKED_AT });
  });

  it('sem verificação salva, não há relatório', () => {
    expect(readCapabilityReport()).toBeNull();
  });

  // LGPD, Art. 6°, III. O cache existe para liberar ou bloquear tela, e para isso
  // basta o nome da capacidade e quando foi verificada. A medida que provou a
  // capacidade — passos, bpm, minutos de sono — ficaria parada no aparelho sem
  // uso, fora do consentimento que rege o dado de saúde (§2.3).
  it('não guarda medida junto do relatório', () => {
    // Chega por JSON como chegaria de um chamador descuidado: o tipo não impede.
    const withMeasurements: CapabilityReport = JSON.parse(
      JSON.stringify({ ...REPORT, steps: 8412, restingHeartRate: 58, heartRate: [150, 152] })
    );

    saveCapabilityReport(withMeasurements, CHECKED_AT);

    // Olha o que foi gravado, e não o que a leitura devolve: a leitura também
    // filtra, e esconderia a medida parada no aparelho.
    const written = [...mockDeviceMemory.values()].join(' ');
    const leaked = ['steps', 'restingHeartRate', 'heartRate'].filter((key) =>
      written.includes(key)
    );
    if (leaked.length > 0) {
      throw new Error(`MEDIDA GUARDADA NO CACHE: ${leaked.join(', ')} ficou no aparelho`);
    }
  });

  it('descarta o que não é um estado de capacidade', () => {
    const corrupted: CapabilityReport = JSON.parse(
      JSON.stringify({ ...REPORT, dailyActivity: 8412 })
    );

    saveCapabilityReport(corrupted, CHECKED_AT);

    expect(readCapabilityReport()?.report.dailyActivity).toBe('unknown');
  });
});
