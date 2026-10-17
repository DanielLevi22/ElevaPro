import type { RestPeriod } from '@elevapro/shared';
import { restCardState, restingTitle, restUntil } from '../restCopy';

const rest = (extra: Partial<RestPeriod>): RestPeriod => ({
  id: 'pausa-1',
  starts_on: '2026-10-01',
  planned_until: null,
  ended_on: null,
  ...extra,
});

describe('o Modo Descanso na tela', () => {
  it('a duração conta hoje: uma semana vai até o sexto dia depois', () => {
    expect(restUntil('3d', '2026-10-14')).toBe('2026-10-16');
    expect(restUntil('1w', '2026-10-14')).toBe('2026-10-20');
    expect(restUntil('open', '2026-10-14')).toBeNull();
  });

  it('o cartão mostra a pausa em curso, e depois a volta até ser vista', () => {
    expect(restCardState([rest({})], '2026-10-14', [])?.kind).toBe('resting');
    const back = rest({ ended_on: '2026-10-13' });
    expect(restCardState([back], '2026-10-14', [])?.kind).toBe('return');
    expect(restCardState([back], '2026-10-14', ['pausa-1'])).toBeNull();
  });

  it('diz até quando, ou que não há data', () => {
    expect(restingTitle(rest({ planned_until: '2026-10-21' }))).toBe('Até 21 out');
    expect(restingTitle(rest({}))).toBe('Sem data para voltar');
  });
});
