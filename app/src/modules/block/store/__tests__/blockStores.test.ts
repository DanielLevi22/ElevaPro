import { useBlockStore } from '../blockStore';
import { useReviewStore } from '../reviewStore';

describe('useReviewStore', () => {
  beforeEach(() => useReviewStore.getState().reset());

  it('guarda o que mudou e a proposta até aprovar', () => {
    useReviewStore.getState().setChanges({ training_days: 3 });
    useReviewStore.getState().setPending({ blockNumber: 3 } as never);

    expect(useReviewStore.getState()).toMatchObject({
      changes: { training_days: 3 },
      early: false,
      pending: { blockNumber: 3 },
    });
  });

  it('trocar antes do fim começa uma reavaliação limpa, com a pergunta escolhida', () => {
    useReviewStore.getState().setChanges({ training_days: 3 });

    useReviewStore.getState().startEarly('gym_type');

    expect(useReviewStore.getState()).toMatchObject({
      changes: {},
      early: true,
      focus: 'gym_type',
      pending: null,
    });
  });
});

describe('useBlockStore', () => {
  it('a descarga e a volta aparecem uma vez por bloco e por pausa', () => {
    const store = useBlockStore.getState();
    store.markDeloadSeen('bloco-1');
    store.markDeloadSeen('bloco-1');
    store.markReturnSeen('pausa-1');
    store.markReturnSeen('pausa-1');

    expect(useBlockStore.getState().deloadSeen).toEqual(['bloco-1']);
    expect(useBlockStore.getState().returnSeen).toEqual(['pausa-1']);
  });

  it('"lembrar amanhã" vale por bloco', () => {
    useBlockStore.getState().snoozeReview('bloco-1', '2026-10-15');
    useBlockStore.getState().snoozeReview('bloco-2', '2026-10-20');

    expect(useBlockStore.getState().reviewSnoozedUntil).toEqual({
      'bloco-1': '2026-10-15',
      'bloco-2': '2026-10-20',
    });
  });
});
