/**
 * O descanso como a tela bloqueada mostra: os textos já prontos em português e
 * o tempo em instantes absolutos, para o sistema contar sozinho sem o app.
 */
export interface RestOnLockScreen {
  /** "Descanso · Remada curvada". */
  title: string;
  /** "Próxima: série 3 · 10 × 45 kg". */
  subtitle: string;
  /** Quando o descanso acaba, em milissegundos desde a época. */
  endsAt: number;
  /** A duração do descanso, em segundos: a barra mede o quanto já passou. */
  totalSeconds: number;
  /** Segundos que faltavam ao pausar; nulo enquanto corre. */
  pausedRemaining: number | null;
  /** O que aparece quando o tempo acaba: "Hora da série 3". */
  doneTitle: string;
  /** Rótulos dos botões: "15 s" e "Pular". */
  addLabel: string;
  skipLabel: string;
}

/** Para parar de ouvir os toques da tela bloqueada. */
export interface RestActionSubscription {
  remove(): void;
}

/** O que a pessoa tocou na tela bloqueada, e quando. */
export interface RestAction {
  type: 'add_time' | 'skip';
  /** Milissegundos desde a época. */
  at: number;
}
