import type { TrainingSignal } from '@elevapro/shared';
import { shouldShowTrainingSignal, toSeenTrainingSignal } from '../shouldShowTrainingSignal';

const sinal: TrainingSignal = {
  id: 'p1',
  name: 'Hipertrofia · Ciclo Verão',
  updatedAt: '2026-09-20T12:00:00Z',
};

describe('toSeenTrainingSignal', () => {
  it('não guarda o nome do plano, só id e updatedAt', () => {
    const visto = toSeenTrainingSignal(sinal);

    expect(Object.keys(visto).sort()).toEqual(['id', 'updatedAt']);
    expect(visto).toEqual({ id: 'p1', updatedAt: '2026-09-20T12:00:00Z' });
  });
});

describe('shouldShowTrainingSignal', () => {
  it('mostra quando o aluno nunca viu nenhum plano', () => {
    expect(shouldShowTrainingSignal({ id: 'p1', updatedAt: '2026-09-20T12:00:00Z' }, null)).toBe(
      true
    );
  });

  it('não repete o mesmo plano já visto, sem mudança', () => {
    const visto = { id: 'p1', updatedAt: '2026-09-20T12:00:00Z' };
    expect(shouldShowTrainingSignal(visto, visto)).toBe(false);
  });

  it('mostra de novo quando o mesmo plano foi republicado depois', () => {
    expect(
      shouldShowTrainingSignal(
        { id: 'p1', updatedAt: '2026-09-21T09:00:00Z' },
        { id: 'p1', updatedAt: '2026-09-20T12:00:00Z' }
      )
    ).toBe(true);
  });

  it('mostra quando um plano novo substituiu o anterior', () => {
    expect(
      shouldShowTrainingSignal(
        { id: 'p2', updatedAt: '2026-09-20T12:00:00Z' },
        { id: 'p1', updatedAt: '2026-09-20T12:00:00Z' }
      )
    ).toBe(true);
  });

  it('não mostra quando não há plano ativo, mesmo com algo visto antes', () => {
    expect(shouldShowTrainingSignal(null, { id: 'p1', updatedAt: '2026-09-20T12:00:00Z' })).toBe(
      false
    );
  });
});
