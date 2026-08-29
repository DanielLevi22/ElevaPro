import { BffUnreachableError } from '@/shared/bff';
import {
  AIBodyScanService,
  BodyScanAnalysisError,
  BodyScanConsentError,
  BodyScanScaleError,
} from '../../services/aiBodyScan';
import { AnamnesisService } from '../../services/anamnesisService';
import { AssessmentStatus } from '../../types/assessment';
import { useAssessmentStore } from '../assessmentStore';

// A classe precisa ser real no mock: o store usa `instanceof` para separar
// falta de consentimento de falha, e um stub não satisfaria a checagem.
jest.mock('../../services/aiBodyScan', () => {
  class BodyScanConsentError extends Error {
    constructor() {
      super('Consentimento de dados de saúde não concedido');
      this.name = 'BodyScanConsentError';
    }
  }
  class BodyScanScaleError extends Error {
    constructor() {
      super('Altura não encontrada — sem régua não há medida');
      this.name = 'BodyScanScaleError';
    }
  }
  const MESSAGES: Record<string, string> = {
    response_truncated: 'A análise ficou grande demais e foi cortada. Tente de novo.',
    ai_unavailable: 'O serviço de análise não respondeu. Tente de novo em instantes.',
  };
  class BodyScanAnalysisError extends Error {
    readonly code: string;
    constructor(code: string) {
      super(MESSAGES[code] ?? 'Não consegui completar a análise. Tente de novo.');
      this.name = 'BodyScanAnalysisError';
      this.code = code;
    }
  }
  return {
    AIBodyScanService: { analyzeImages: jest.fn() },
    BodyScanConsentError,
    BodyScanScaleError,
    BodyScanAnalysisError,
  };
});

jest.mock('../../services/anamnesisService', () => ({
  AnamnesisService: { saveAnamnesis: jest.fn(), getAnamnesis: jest.fn() },
}));

describe('assessmentStore', () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
    jest.clearAllMocks();
  });

  it('should initialize with IDLE status', () => {
    const state = useAssessmentStore.getState();
    expect(state.status).toBe(AssessmentStatus.IDLE);
    expect(state.studentId).toBeNull();
    expect(state.lastResult).toBeNull();
  });

  it('should set studentId', () => {
    useAssessmentStore.getState().setStudentId('student-123');
    expect(useAssessmentStore.getState().studentId).toBe('student-123');
  });

  it('should start scan', async () => {
    const store = useAssessmentStore.getState();
    store.setStudentId('student-123');

    await store.startScan();

    expect(useAssessmentStore.getState().status).toBe(AssessmentStatus.SCANNING);
    expect(useAssessmentStore.getState().studentId).toBe('student-123');
  });

  it('should set captured images', () => {
    const store = useAssessmentStore.getState();
    store.setCapturedImage('front', 'uri-front');
    store.setCapturedImage('side', 'uri-side');

    const state = useAssessmentStore.getState();
    expect(state.capturedImages.front).toBe('uri-front');
    expect(state.capturedImages.side).toBe('uri-side');
  });

  it('should handle successful submitScan', async () => {
    const mockResult = {
      id: 'result-1',
      metrics: { height: 180, weight: 80, bodyFat: 15, muscleMass: 65, bmi: 24.7 },
      segments: { chest: 100, waist: 80, hips: 95, arms: 35, thighs: 55 },
      imageUrl: 'test-url',
      date: new Date().toISOString(),
    };
    (AIBodyScanService.analyzeImages as jest.Mock).mockResolvedValue(mockResult);

    const store = useAssessmentStore.getState();

    // Trigger submitScan
    const submitPromise = store.submitScan();

    // Status should be ANALYZING immediately (or after next tick)
    expect(useAssessmentStore.getState().status).toBe(AssessmentStatus.ANALYZING);

    await submitPromise;

    const state = useAssessmentStore.getState();
    expect(state.status).toBe(AssessmentStatus.COMPLETED);
    expect(state.lastResult).toEqual(mockResult);
    expect(state.history[0]).toEqual(mockResult);
  });

  it('should handle submitScan error', async () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(new Error('Scan failed'));

    const store = useAssessmentStore.getState();
    await store.submitScan();

    expect(useAssessmentStore.getState().status).toBe(AssessmentStatus.ERROR);
    consoleSpy.mockRestore();
  });
});

describe('submitScan — consentimento', () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
    jest.clearAllMocks();
    useAssessmentStore.getState().setCapturedImage('front', 'uri-front');
  });

  it('marca NEEDS_CONSENT quando falta consentimento, sem virar erro', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(new BodyScanConsentError());

    await useAssessmentStore.getState().submitScan();

    expect(useAssessmentStore.getState().status).toBe(AssessmentStatus.NEEDS_CONSENT);
  });

  it('marca ERROR em qualquer outra falha — a guarda não engole tudo', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new Error('body-scan BFF error: 502')
    );

    await useAssessmentStore.getState().submitScan();

    expect(useAssessmentStore.getState().status).toBe(AssessmentStatus.ERROR);
  });
});

describe('submitScan — sem régua', () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
    jest.clearAllMocks();
    useAssessmentStore.getState().setCapturedImage('front', 'uri-front');
  });

  it('não conclui quando falta a altura — o modelo não pode voltar a chutar', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(new BodyScanScaleError());

    await useAssessmentStore.getState().submitScan();

    const state = useAssessmentStore.getState();
    expect(state.status).not.toBe(AssessmentStatus.COMPLETED);
    expect(state.lastResult).toBeNull();
  });
});

describe('submitScan — mensagens de falha', () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
    jest.clearAllMocks();
    useAssessmentStore.getState().setCapturedImage('front', 'uri-front');
  });

  it('resposta cortada e serviço fora dão mensagens diferentes', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new BodyScanAnalysisError('response_truncated')
    );
    await useAssessmentStore.getState().submitScan();
    const truncada = useAssessmentStore.getState().errorMessage;

    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new BodyScanAnalysisError('ai_unavailable')
    );
    await useAssessmentStore.getState().submitScan();
    const indisponivel = useAssessmentStore.getState().errorMessage;

    // Antes as duas viravam AssessmentStatus.ERROR sem texto: a tela mostrava
    // o mesmo estado mudo para causas opostas.
    expect(truncada).not.toBe(indisponivel);
    expect(truncada).toContain('cortada');
    expect(indisponivel).toContain('não respondeu');
  });

  it('código desconhecido ainda dá uma frase legível', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new BodyScanAnalysisError('algo_que_nao_mapeamos')
    );

    await useAssessmentStore.getState().submitScan();

    expect(useAssessmentStore.getState().errorMessage).toBe(
      'Não consegui completar a análise. Tente de novo.'
    );
  });

  it('tentar de novo limpa a mensagem anterior', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new BodyScanAnalysisError('ai_unavailable')
    );
    await useAssessmentStore.getState().submitScan();
    expect(useAssessmentStore.getState().errorMessage).not.toBeNull();

    (AIBodyScanService.analyzeImages as jest.Mock).mockResolvedValue({
      id: '1',
      date: '2026-08-12',
      metrics: { height: 175, weight: 70, bodyFat: 18, muscleMass: 35, bmi: 22.9 },
      segments: { chest: 100, waist: 82, hips: 95, arms: 38, thighs: 55 },
      imageUrl: '',
    });
    await useAssessmentStore.getState().submitScan();

    expect(useAssessmentStore.getState().errorMessage).toBeNull();
    expect(useAssessmentStore.getState().status).toBe(AssessmentStatus.COMPLETED);
  });
});

describe('submitAnamnesis — a forma gravada', () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
    jest.clearAllMocks();
    (AnamnesisService.saveAnamnesis as jest.Mock).mockResolvedValue({ success: true });
  });

  // A forma plana é a canônica: é o que o web e a tela adaptativa gravam, e o
  // que todos os leitores esperam. O embrulho `{ questionId, value }` repetia a
  // chave do próprio objeto — e era produzido só por esta tela, justamente a do
  // aluno que tem especialista lendo o contexto dele pela IA.
  it('grava o valor direto, sem o embrulho', async () => {
    const store = useAssessmentStore.getState();
    store.setStudentId('aluno-1');
    store.setAnamnesisResponse('height', 175);
    store.setAnamnesisResponse('injuries', 'Hérnia de disco L5-S1');

    await useAssessmentStore.getState().submitAnamnesis();

    expect(AnamnesisService.saveAnamnesis).toHaveBeenCalledWith(
      'aluno-1',
      { height: 175, injuries: 'Hérnia de disco L5-S1' },
      true
    );
  });
});

describe('submitScan — o erro que o aluno lê', () => {
  const GENERICA = 'Não consegui completar a análise. Tente de novo.';

  beforeEach(() => {
    useAssessmentStore.getState().reset();
    jest.clearAllMocks();
    useAssessmentStore.getState().setCapturedImage('front', 'uri-front');
  });

  // A tela da screenshot: o aluno sem altura cadastrada via "não consegui
  // completar, tente de novo" e um botão que nunca podia funcionar. O serviço
  // já produzia a mensagem certa; o store a substituía pela genérica.
  it('falta de altura não vira a mensagem genérica', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(new BodyScanScaleError());

    await useAssessmentStore.getState().submitScan();

    expect(useAssessmentStore.getState().errorMessage).not.toBe(GENERICA);
  });

  // Quatro causas chegavam como a mesma tela muda. As outras cinco superfícies
  // de IA do produto já passam o erro pelo tradutor compartilhado; esta ficou
  // de fora quando ele foi criado.
  it('falha de rede não vira a mensagem genérica', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new BffUnreachableError('elevapro.app', 'não respondeu em 60s')
    );

    await useAssessmentStore.getState().submitScan();

    expect(useAssessmentStore.getState().errorMessage).not.toBe(GENERICA);
  });

  // TRAVA: o diagnóstico do `client.ts` nomeia host, variável de ambiente e
  // qual proteção interceptou. Isso é indispensável para quem conserta e não
  // pode chegar ao aluno — em release entrega topologia de graça.
  //
  // Medido com `__DEV__` desligado de propósito: em desenvolvimento o detalhe
  // aparece na tela por decisão do tradutor, porque ali quem lê é quem conserta.
  // Afirmar a ausência no modo errado provaria o oposto do que interessa.
  it('não expõe o host da infraestrutura ao aluno em release', async () => {
    (AIBodyScanService.analyzeImages as jest.Mock).mockRejectedValue(
      new BffUnreachableError('elevapro-preview.vercel.app', 'respondeu 401')
    );

    const global_ = globalThis as { __DEV__?: boolean };
    const antes = global_.__DEV__;
    global_.__DEV__ = false;
    try {
      await useAssessmentStore.getState().submitScan();
    } finally {
      global_.__DEV__ = antes;
    }

    expect(useAssessmentStore.getState().errorMessage).not.toContain('vercel.app');
  });
});
