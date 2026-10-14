import { blockCardState } from '../blockCardState';

const BLOCK = { start_date: '2026-09-19', end_date: '2026-10-17' };
const fresh = { deloadSeen: false, snoozedUntil: null };

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

  it('no meio do bloco, nada', () => {
    expect(blockCardState(BLOCK, '2026-09-25', fresh)).toBeNull();
  });
});
