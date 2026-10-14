import type { BlockReport } from '@elevapro/shared';
import { blockHeadline, changesLine, promiseLine } from '../blockReportCopy';

const report = (extra: Partial<BlockReport> = {}): BlockReport => ({
  start: '2026-09-15',
  end: '2026-10-13',
  verdict: 'on_track',
  promisedKg: { from: -1.2, to: -2 },
  realKg: -1.5,
  weight: { before: 86, after: 84.5 },
  waist: null,
  workouts: { done: 14, planned: 16 },
  records: 5,
  diet: null,
  streakWeeks: 4,
  changes: { loads: 5, swaps: 1, targets: 1 },
  ...extra,
});

describe('o texto do relatório do bloco (B4)', () => {
  it('o título vem do prometido × real, e atrás do combinado não leva bronca', () => {
    expect(blockHeadline(report(), 'Bloco 1 · Hipertrofia · 4x por semana')).toEqual({
      eyebrow: 'Bloco 1 · 15 set a 13 out',
      title: 'Dentro do combinado',
      sub: 'Seu peso andou como a gente prometeu no primeiro dia.',
    });
    expect(blockHeadline(report({ verdict: 'behind' }), 'Bloco 1').sub).not.toMatch(
      /falt|deveria|precisa/i
    );
  });

  it('o prometido e o real na mesma linha, com o menos tipográfico', () => {
    expect(promiseLine(report())).toBe('Prometido no 1º dia: −1,2 a −2 kg · Real: −1,5 kg');
    expect(promiseLine(report({ promisedKg: null }))).toBeNull();
  });

  it('conta as mudanças do plano com o que mudou', () => {
    expect(changesLine({ loads: 5, swaps: 1, targets: 1 })).toEqual({
      title: 'Seu plano mudou 7 vezes com você',
      sub: '5 cargas subiram, 1 exercício trocado e a meta revista 1 vez.',
    });
    expect(changesLine({ loads: 0, swaps: 0, targets: 0 }).title).toBe(
      'Seu plano seguiu como estava'
    );
  });
});
