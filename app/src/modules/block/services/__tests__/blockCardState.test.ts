import { blockCardState } from '../blockCardState';

const BLOCK = { start_date: '2026-09-19', end_date: '2026-10-17' };
const fresh = { deloadSeen: false, snoozedUntil: null, stalledWeek: null, stallSeen: null };

describe('o cartão do bloco na tela inicial', () => {
  it('na semana 4, a descarga até ser vista', () => {
    expect(blockCardState(BLOCK, '2026-10-13', fresh)).toBe('deload');
    expect(blockCardState(BLOCK, '2026-10-13', { ...fresh, deloadSeen: true })).toBeNull();
  });

  it('depois do fim, a reavaliação, até amanhã se pediu para lembrar depois', () => {
    expect(blockCardState(BLOCK, '2026-10-17', fresh)).toBe('review');
    expect(
      blockCardState(BLOCK, '2026-10-17', { ...fresh, snoozedUntil: '2026-10-18' })
    ).toBeNull();
    expect(blockCardState(BLOCK, '2026-10-18', { ...fresh, snoozedUntil: '2026-10-18' })).toBe(
      'review'
    );
  });

  // #376: 3 semanas com a meta seguida e o peso parado antecipam a reavaliação.
  it('no meio do bloco, o peso parado oferece reavaliar, até "Agora não"', () => {
    const stalled = { ...fresh, stalledWeek: '2026-09-28' };
    expect(blockCardState(BLOCK, '2026-10-01', stalled)).toBe('stalled');
    expect(blockCardState(BLOCK, '2026-10-01', { ...stalled, stallSeen: '2026-09-28' })).toBeNull();
    // Um check-in novo com o peso ainda parado é outro quadro: oferece de novo.
    expect(
      blockCardState(BLOCK, '2026-10-06', {
        ...stalled,
        stalledWeek: '2026-10-05',
        stallSeen: '2026-09-28',
      })
    ).toBe('stalled');
  });

  it('no meio do bloco, nada', () => {
    expect(blockCardState(BLOCK, '2026-09-25', fresh)).toBeNull();
  });
});
