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
  changes: { swaps: 1, targets: 1, simplified: 0 },
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

  it('encerrado antes do fim não é concluído, e as semanas vêm das datas', () => {
    const early = report({ start: '2026-10-13', end: '2026-10-20', verdict: 'no_promise' });
    expect(blockHeadline(early, 'Bloco 2', true)).toMatchObject({
      title: 'Encerrado antes do fim',
      sub: '1 semana de treino até você mudar o plano.',
    });
    expect(blockHeadline(report({ verdict: 'no_promise' }), 'Bloco 1').sub).toBe(
      '4 semanas de treino. Veja o que mudou.'
    );
  });

  it('o prometido e o real na mesma linha, com o menos tipográfico', () => {
    expect(promiseLine(report())).toBe('Prometido no 1º dia: −1,2 a −2 kg · Real: −1,5 kg');
    expect(promiseLine(report({ promisedKg: null }))).toBeNull();
  });

  // O recorde é da pessoa: o plano mudou quando a meta ou o exercício mudaram.
  it('conta as mudanças do plano, sem os recordes', () => {
    expect(changesLine({ swaps: 1, targets: 2, simplified: 0 })).toEqual({
      title: 'Seu plano mudou 3 vezes com você',
      sub: '1 exercício trocado e a meta revista 2 vezes.',
    });
    expect(changesLine({ swaps: 0, targets: 0, simplified: 0 }).title).toBe(
      'Seu plano seguiu como estava'
    );
  });
});
