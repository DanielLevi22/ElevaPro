import type { LeaderboardEntry } from '@elevapro/shared';
import { buildLeaderboardView, initialOf, rankChange, TOP_SIZE } from '../leaderboardView';

function entry(index: number, overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    studentId: `s${index}`,
    displayName: `Pessoa ${index}`,
    points: 1000 - index * 10,
    rank: index + 1,
    previousRank: index + 1,
    isMe: false,
    ...overrides,
  };
}

const ids = (entries: (LeaderboardEntry | null)[]) => entries.map((e) => e?.studentId ?? null);

describe('placar: pódio e classificação', () => {
  it('põe os três primeiros no pódio, na ordem 2º, 1º e 3º', () => {
    const view = buildLeaderboardView([0, 1, 2, 3, 4].map((i) => entry(i)));
    expect(view.podium.map((slot) => slot.step)).toEqual([2, 1, 3]);
    expect(ids(view.podium.map((slot) => slot.entry))).toEqual(['s1', 's0', 's2']);
    expect(ids(view.rows)).toEqual(['s3', 's4']);
    expect(view.isEmpty).toBe(false);
  });

  it('deixa vazio o degrau que falta', () => {
    const view = buildLeaderboardView([entry(0), entry(1)]);
    expect(ids(view.podium.map((slot) => slot.entry))).toEqual(['s1', 's0', null]);
    expect(view.rows).toEqual([]);
  });

  it('com uma pessoa, só o primeiro degrau tem gente', () => {
    const view = buildLeaderboardView([entry(0)]);
    expect(ids(view.podium.map((slot) => slot.entry))).toEqual([null, 's0', null]);
  });

  it('sem ninguém, o placar está vazio', () => {
    const view = buildLeaderboardView([]);
    expect(view.isEmpty).toBe(true);
    expect(view.podium.every((slot) => slot.entry === null)).toBe(true);
  });

  // O placar do especialista lista todos os alunos, mesmo sem ponto.
  it('quem não pontuou não sobe ao pódio', () => {
    const view = buildLeaderboardView([
      entry(0, { points: 100 }),
      entry(1, { points: 0 }),
      entry(2, { points: 0 }),
    ]);
    expect(ids(view.podium.map((slot) => slot.entry))).toEqual([null, 's0', null]);
    expect(ids(view.rows)).toEqual(['s1', 's2']);
  });

  it('placar só de zeros está vazio', () => {
    const view = buildLeaderboardView([entry(0, { points: 0 }), entry(1, { points: 0 })]);
    expect(view.isEmpty).toBe(true);
    expect(ids(view.rows)).toEqual(['s0', 's1']);
  });

  it('a linha do usuário fora dos 50 primeiros vem separada', () => {
    const top = Array.from({ length: TOP_SIZE }, (_, i) => entry(i));
    const me = entry(80, { points: 5, rank: 81, isMe: true });
    const view = buildLeaderboardView([...top, me]);
    expect(view.ownRowOutside).toBe(me);
    expect(view.rows).toHaveLength(TOP_SIZE - 3);
    expect(view.rows).not.toContain(me);
  });

  it('dentro dos 50, a linha do usuário fica na classificação', () => {
    const me = entry(4, { isMe: true });
    const view = buildLeaderboardView([0, 1, 2, 3].map((i) => entry(i)).concat(me));
    expect(view.ownRowOutside).toBeNull();
    expect(view.rows).toContain(me);
  });
});

describe('placar: variação desde a semana passada', () => {
  it('subiu', () => {
    expect(rankChange(entry(3, { rank: 4, previousRank: 6 }))).toEqual({ tone: 'up', label: '+2' });
  });

  it('desceu', () => {
    expect(rankChange(entry(4, { rank: 5, previousRank: 4 }))).toEqual({
      tone: 'down',
      label: '-1',
    });
  });

  it('ficou', () => {
    expect(rankChange(entry(6, { rank: 7, previousRank: 7 }))).toEqual({
      tone: 'same',
      label: '0',
    });
  });

  it('não pontuou na semana passada', () => {
    expect(rankChange(entry(2, { previousRank: null }))).toEqual({ tone: 'new', label: 'novo' });
  });
});

describe('placar: inicial no lugar da foto', () => {
  it('usa a primeira letra do nome', () => {
    expect(initialOf('ana C.')).toBe('A');
  });

  it('nome vazio não quebra o círculo', () => {
    expect(initialOf('  ')).toBe('?');
  });
});
