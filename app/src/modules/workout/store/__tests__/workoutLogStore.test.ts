import { useWorkoutLogStore } from '../workoutLogStore';

const mockUpdateSessionFeedback = jest.fn();
const mockHasCollectionConsent = jest.fn();

// Os stores capturam o serviço no import, que acontece ANTES de `const
// mockUpdateSessionFeedback` inicializar. Por isso a indireção: se o mock fosse
// referenciado direto aqui, o store guardaria `undefined` para sempre.
jest.mock('@elevapro/shared', () => ({
  __esModule: true,
  ...jest.requireActual('@elevapro/shared'),
  createWorkoutsService: () => ({
    updateSessionFeedback: (...args: unknown[]) => mockUpdateSessionFeedback(...args),
  }),
  createHealthService: () => ({
    hasCollectionConsent: (...args: unknown[]) => mockHasCollectionConsent(...args),
  }),
}));

const ALUNO = 'aluno-1';
const SESSAO = 'sessao-1';

function sessaoGravada(over: Record<string, unknown> = {}) {
  return {
    id: SESSAO,
    intensity: 7,
    notes: 'era o ombro esquerdo',
    feedback_edited_at: '2026-08-28T12:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateSessionFeedback.mockResolvedValue(sessaoGravada());
  mockHasCollectionConsent.mockResolvedValue(true);
  useWorkoutLogStore.setState({ logs: [], loading: false });
});

describe('updateSessionFeedback — o direito de correção (Art. 18, III)', () => {
  it('corrige o RPE e a observação da própria sessão', async () => {
    await useWorkoutLogStore
      .getState()
      .updateSessionFeedback(SESSAO, ALUNO, { intensity: 7, notes: 'era o ombro esquerdo' });

    expect(mockUpdateSessionFeedback).toHaveBeenCalledWith(SESSAO, {
      intensity: 7,
      notes: 'era o ombro esquerdo',
    });
  });

  it('reflete a correção na lista já carregada, sem refetch', async () => {
    useWorkoutLogStore.setState({
      logs: [
        {
          id: SESSAO,
          intensity: 8,
          notes: 'senti dor no ombro direito',
          feedback_edited_at: null,
        },
      ] as never,
    });

    await useWorkoutLogStore
      .getState()
      .updateSessionFeedback(SESSAO, ALUNO, { intensity: 7, notes: 'era o ombro esquerdo' });

    const log = useWorkoutLogStore.getState().logs[0];
    expect(log.notes).toBe('era o ombro esquerdo');
    expect(log.feedback_edited_at).toBe('2026-08-28T12:00:00Z');
  });
});

/**
 * ── TRAVAS LGPD ──────────────────────────────────────────────────────────────
 *
 * Os testes abaixo NÃO verificam que a correção funciona. Verificam que ela
 * continua restrita, e existem para falhar na cara de quem tentar afrouxar a
 * restrição sem saber que ela é jurídica, não técnica.
 *
 * Se um destes barrar você: o caminho não é ajustar o teste. É voltar ao parecer
 * em `docs/PRDs/session-feedback-correction.md` e ao `docs/LGPD_COMPLIANCE.md`.
 */
describe('TRAVA LGPD — o que a correção não pode fazer', () => {
  /**
   * Art. 11, I — o texto livre é dado sensível de saúde e só é gravado com
   * consentimento vigente. É onde o aluno escreve "senti dor no ombro".
   *
   * Séries, cargas, datas e RPE são execução de contrato (Art. 7°, V) e não
   * dependem de consentimento — por isso o RPE passa e o texto não. Tratar os
   * dois sob a mesma decisão trataria medida de carga como relato clínico.
   *
   * É isto que dá sentido ao "Agora não" do `HealthDataConsentGate`: sem esta
   * verificação, recusar seria um botão que não muda nada.
   */
  it('não grava o texto corrigido sem consentimento vigente, mas grava o RPE', async () => {
    mockHasCollectionConsent.mockResolvedValue(false);

    await useWorkoutLogStore
      .getState()
      .updateSessionFeedback(SESSAO, ALUNO, { intensity: 7, notes: 'texto novo' });

    const [, patch] = mockUpdateSessionFeedback.mock.calls[0];
    expect(patch.intensity).toBe(7);
    expect(patch.notes).toBeNull();
    if (patch.notes === 'texto novo') {
      throw new Error(
        'VAZAMENTO: texto de saúde gravado sem consentimento vigente (Art. 11, I). ' +
          'Ver notasSeConsentido e o Bloco B do parecer em docs/PRDs/session-feedback-correction.md'
      );
    }
  });

  /**
   * Art. 11 — falha de rede não autoriza. Na dúvida, o texto não é gravado.
   * Um `catch` que deixasse passar transformaria instabilidade em coleta.
   */
  it('não grava o texto quando a verificação de consentimento falha', async () => {
    mockHasCollectionConsent.mockRejectedValue(new Error('rede'));

    await useWorkoutLogStore
      .getState()
      .updateSessionFeedback(SESSAO, ALUNO, { intensity: 5, notes: 'texto novo' });

    expect(mockUpdateSessionFeedback.mock.calls[0][1].notes).toBeNull();
  });

  /**
   * Art. 18, VI — apagar é a eliminação da parte consentida, e eliminar nunca
   * depende de consentimento. Exigir consentimento vigente para APAGAR seria
   * prender o dado de quem revogou a autorização: exatamente ao contrário.
   */
  it('apaga a observação mesmo sem consentimento vigente', async () => {
    mockHasCollectionConsent.mockResolvedValue(false);

    await useWorkoutLogStore.getState().updateSessionFeedback(SESSAO, ALUNO, { notes: null });

    expect(mockUpdateSessionFeedback.mock.calls[0][1]).toEqual({ notes: null });
    expect(mockHasCollectionConsent).not.toHaveBeenCalled();
  });

  /**
   * Art. 18, III + Art. 6°, V — o aluno corrige a DECLARAÇÃO, nunca a MEDIDA.
   * O remédio para uma medida inexata é medir de novo; digitar outro número não
   * devolve exatidão, cria um dado falso que o profissional usa para prescrever.
   *
   * A `0036` impõe isto no banco por privilégio de coluna, e o `verify-rls.sql`
   * prova lá. Aqui a trava é de tipo e de payload: nenhuma coluna de medida pode
   * vazar para o patch, nem por spread acidental de um objeto maior.
   */
  it('nunca envia coluna de medida no patch de correção', async () => {
    await useWorkoutLogStore
      .getState()
      .updateSessionFeedback(SESSAO, ALUNO, { intensity: 7, notes: 'ok' });

    const [, patch] = mockUpdateSessionFeedback.mock.calls[0];
    const proibidas = [
      'started_at',
      'completed_at',
      'session_type',
      'duration_seconds',
      'active_calories',
      'student_id',
      'workout_id',
    ];
    const vazadas = proibidas.filter((coluna) => coluna in patch);

    if (vazadas.length > 0) {
      throw new Error(
        `HISTÓRICO REESCRITO: a correção enviou coluna de medida (${vazadas.join(', ')}). ` +
          'O aluno corrige o que declarou, não o que aconteceu — Art. 18, III. ' +
          'Ver a migration 0036 e o bloco de prova em scripts/verify-rls.sql'
      );
    }
  });

  /**
   * Art. 11 + Bloco E do parecer — o erro do PostgREST carrega o payload da
   * linha, e o payload aqui é `notes`. Logar o objeto de erro publica texto
   * clínico no console, que em release vai para onde ninguém controla.
   *
   * Mesma regra já aplicada em `saveWorkoutSession` e `saveCardioSession`.
   */
  it('não loga o objeto de erro, que carrega o texto do aluno', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateSessionFeedback.mockRejectedValue({
      message: 'duplicate key',
      details: 'Failing row contains (senti dor no ombro direito)',
    });

    await expect(
      useWorkoutLogStore
        .getState()
        .updateSessionFeedback(SESSAO, ALUNO, { notes: 'senti dor no ombro direito' })
    ).rejects.toBeDefined();

    for (const chamada of spy.mock.calls) {
      const impresso = chamada.map((a) => JSON.stringify(a) ?? '').join(' ');
      if (impresso.includes('senti dor no ombro')) {
        throw new Error(
          'VAZAMENTO EM LOG: o texto de saúde do aluno foi impresso no console. ' +
            'Logue só a mensagem própria, nunca o objeto do PostgREST — Art. 11 / Bloco E.'
        );
      }
    }

    spy.mockRestore();
  });
});
