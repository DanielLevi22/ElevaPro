import type { QualidadeDaCaptura } from '../../store/assessmentStore';
import type { CaptureFraming } from '../../types/assessment';
import { analysisSteps, cameraChips, captureChecks } from '../captureProgress';
import type { Portao } from '../portao';

const LIMPA: QualidadeDaCaptura = {
  backlit: false,
  lowLight: false,
  blownOut: false,
  framingConfirmed: true,
};

const NIVELADO: CaptureFraming = {
  markTop: 0.1,
  markBottom: 0.9,
  pitch: 9,
  roll: 1.1,
  levelSensor: true,
  camera: 'back',
};

function portao(instrucao: Portao['instrucao']): Portao {
  return {
    liberado: instrucao === null,
    proximidade: instrucao === null ? 'pronto' : 'quase',
    ocupacao: 0.8,
    instrucao,
    deveFalar: false,
    avisos: [],
  };
}

describe('captureChecks', () => {
  it('fica vazia antes da primeira foto', () => {
    expect(captureChecks({ photos: 0, framing: null, quality: LIMPA })).toEqual([]);
  });

  it('três linhas ok quando a captura saiu limpa', () => {
    const checks = captureChecks({ photos: 2, framing: NIVELADO, quality: LIMPA });
    expect(checks.map((check) => check.tone)).toEqual(['ok', 'ok', 'ok']);
  });

  it('a saída manual marca o enquadramento', () => {
    const checks = captureChecks({
      photos: 1,
      framing: NIVELADO,
      quality: { ...LIMPA, framingConfirmed: false },
    });
    expect(checks.find((check) => check.key === 'framing')?.tone).toBe('attention');
  });

  it.each([
    ['backlit', 'Contraluz'],
    ['lowLight', 'escuro'],
    ['blownOut', 'estourada'],
  ] as const)('qualquer aviso de luz marca a iluminação (%s)', (aviso, texto) => {
    const light = captureChecks({
      photos: 3,
      framing: NIVELADO,
      quality: { ...LIMPA, [aviso]: true },
    }).find((check) => check.key === 'light');
    expect(light?.tone).toBe('attention');
    expect(light?.detail).toContain(texto);
  });

  it('sem sensor o nível não aparece como conferido', () => {
    const level = captureChecks({
      photos: 1,
      framing: { ...NIVELADO, levelSensor: false },
      quality: LIMPA,
    })[0];
    expect(level.tone).toBe('attention');
  });

  it('roll acima da tolerância do portão marca o nível', () => {
    const level = captureChecks({
      photos: 1,
      framing: { ...NIVELADO, roll: 2.4 },
      quality: LIMPA,
    })[0];
    expect(level.tone).toBe('attention');
  });
});

describe('cameraChips', () => {
  const NIVEL = { pitch: 8, roll: 0.6, isAvailable: true };

  it('corpo cortado apaga "corpo inteiro" e mantém a distância', () => {
    const [, distancia, corpo] = cameraChips(
      portao({ id: 'pes-cortados', texto: 'Seus pés estão cortados.' }),
      NIVEL
    );
    expect(corpo.ok).toBe(false);
    expect(distancia.ok).toBe(true);
  });

  it('pedir para se afastar apaga a distância', () => {
    const [, distancia] = cameraChips(portao({ id: 'afaste', texto: 'Afaste-se.' }), NIVEL);
    expect(distancia.ok).toBe(false);
  });

  it('portão aberto acende distância e corpo inteiro', () => {
    const [nivel, distancia, corpo] = cameraChips(portao(null), NIVEL);
    expect([nivel.ok, distancia.ok, corpo.ok]).toEqual([true, true, true]);
    expect(nivel.label).toBe('Nível 1°');
  });

  it('antes do primeiro quadro nada está confirmado', () => {
    const [, distancia, corpo] = cameraChips(null, NIVEL);
    expect([distancia.ok, corpo.ok]).toEqual([false, false]);
  });

  it('aparelho sem sensor não afirma o nível', () => {
    const [nivel] = cameraChips(portao(null), { pitch: 0, roll: 0, isAvailable: false });
    expect(nivel.ok).toBe(false);
    expect(nivel.label).not.toMatch(/\d/);
  });
});

describe('analysisSteps', () => {
  it('sem etapa, a primeira está em andamento', () => {
    expect(analysisSteps(null).map((step) => step.state)).toEqual([
      'doing',
      'pending',
      'pending',
      'pending',
    ]);
  });

  it('cada etapa marca as anteriores como feitas', () => {
    expect(analysisSteps('postura').map((step) => step.state)).toEqual([
      'done',
      'done',
      'doing',
      'pending',
    ]);
    expect(analysisSteps('recomendacoes').at(-1)?.state).toBe('doing');
  });
});
