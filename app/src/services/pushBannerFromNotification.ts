import type { PushBannerIcon, PushBannerRequest, PushBannerTone } from '@/components/ui/pushBanner';

const TONS_VALIDOS: readonly PushBannerTone[] = ['danger', 'warning', 'success', 'info'];
const ICONES_VALIDOS: readonly PushBannerIcon[] = ['triangle-alert', 'utensils', 'dumbbell'];

function ehTom(valor: unknown): valor is PushBannerTone {
  return typeof valor === 'string' && (TONS_VALIDOS as readonly string[]).includes(valor);
}

function ehIcone(valor: unknown): valor is PushBannerIcon {
  return typeof valor === 'string' && (ICONES_VALIDOS as readonly string[]).includes(valor);
}

interface NotificationContentMinimo {
  title: string | null;
  body: string | null;
  data?: Record<string, unknown>;
}

/**
 * O conteúdo de uma notificação local recebida vira balão, ou não vira nada.
 *
 * `null` para qualquer notificação sem `data.tone`/`data.icon` reconhecidos —
 * é o que mantém o balão fora de notificação de outro sistema (ex: uma futura
 * lib de terceiros que agende algo sem passar por aqui).
 *
 * @example
 * pushBannerFromNotification({ title: 'Hora da refeição!', body: 'Almoço', data: { tone: 'info', icon: 'utensils' } })
 * // { tone: 'info', icon: 'utensils', title: 'Hora da refeição!', body: 'Almoço' }
 */
export function pushBannerFromNotification(
  content: NotificationContentMinimo
): PushBannerRequest | null {
  if (!content.title || !content.body) return null;

  const data = content.data ?? {};
  if (!ehTom(data.tone) || !ehIcone(data.icon)) return null;

  return {
    tone: data.tone,
    icon: data.icon,
    title: content.title,
    body: content.body,
  };
}
