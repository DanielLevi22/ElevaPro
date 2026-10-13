import { HEALTH_CONDITIONS, injuryRecord, screen, screeningRecord } from '../screening';

const CLINICAL = ['diabetes', 'kidney', 'pregnancy', 'eating_disorder'] as const;

describe('screen', () => {
  it.each(CLINICAL)('condição clínica (%s) leva a sem dieta, só treino', (condition) => {
    expect(screen({ kind: 'answered', conditions: [condition] })).toEqual({
      diet: 'referred',
      reason: 'clinical_condition',
    });
  });

  it('"Prefiro não informar" leva a sem dieta, só treino', () => {
    expect(screen({ kind: 'declined' })).toEqual({ diet: 'referred', reason: 'undisclosed' });
  });

  it('"Nenhum" segue para a dieta', () => {
    expect(screen({ kind: 'answered', conditions: ['none'] })).toEqual({ diet: 'allowed' });
  });

  it('lesão sozinha não tira a dieta: muda o treino, não a alimentação', () => {
    expect(screen({ kind: 'answered', conditions: ['injury'] })).toEqual({ diet: 'allowed' });
  });

  it('lesão junto de condição clínica continua sem dieta', () => {
    expect(screen({ kind: 'answered', conditions: ['injury', 'diabetes'] }).diet).toBe('referred');
  });
});

/**
 * TRAVA — a condição marcada não é guardada nem vai à IA (ADR-0044; Art. 6°, III).
 *
 * O que sai da triagem é o que a anamnese grava, e é o que o plano manda adiante.
 * Se uma condição atravessar aqui, ela vira diagnóstico guardado e diagnóstico no
 * prompt. Diabetes, doença renal, gestação e transtorno alimentar ficam só na tela.
 */
describe('screeningRecord', () => {
  it('não carrega condição clínica nenhuma, nem pelo id nem pelo texto', () => {
    const clinicalLabels = HEALTH_CONDITIONS.filter((c) =>
      (CLINICAL as readonly string[]).includes(c.id)
    ).map((c) => c.label);
    for (const condition of CLINICAL) {
      const record = JSON.stringify(
        screeningRecord({ kind: 'answered', conditions: [condition, 'injury'] })
      );
      for (const forbidden of [...CLINICAL, ...clinicalLabels]) {
        if (record.toLowerCase().includes(forbidden.toLowerCase())) {
          throw new Error(
            `DIAGNÓSTICO GRAVADO: "${forbidden}" saiu da triagem para a anamnese — ${record}`
          );
        }
      }
    }
  });

  it('grava o resultado e se houve lesão, que o treino precisa considerar', () => {
    expect(screeningRecord({ kind: 'answered', conditions: ['diabetes', 'injury'] })).toEqual({
      diet_screening: 'referred',
      diet_screening_reason: 'clinical_condition',
      injury_reported: true,
      injuries: [],
    });
    expect(screeningRecord({ kind: 'answered', conditions: ['none'] })).toEqual({
      diet_screening: 'allowed',
      injury_reported: false,
      injuries: [],
    });
  });

  /** A issue: "Lesão continua guardada por região." */
  it('guarda a lesão por região, na mesma chave da anamnese longa', () => {
    expect(
      screeningRecord({ kind: 'answered', conditions: ['injury'], injuryRegions: ['Joelhos'] })
    ).toEqual({ diet_screening: 'allowed', injury_reported: true, injuries: ['Joelhos'] });
    expect(injuryRecord(['Ombros', 'Coluna'])).toEqual({
      injury_reported: true,
      injuries: ['Ombros', 'Coluna'],
    });
    expect(injuryRecord([])).toEqual({ injury_reported: false, injuries: [] });
  });
});
