import {
  AIBodyScanService,
  BodyScanConsentError,
  BodyScanScaleError,
} from '../../services/aiBodyScan';
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
  return {
    AIBodyScanService: { analyzeImages: jest.fn() },
    BodyScanConsentError,
    BodyScanScaleError,
  };
});

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
