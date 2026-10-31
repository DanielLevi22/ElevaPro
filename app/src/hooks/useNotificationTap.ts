import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { registrarFalha } from '@/lib/registro';
import { routeOfNotification } from '@/services/notificationService';
import { handleNoticeAction, noticeDataOf, useNoticeChoicesStore } from '@/shared/notices';

/**
 * Abre a tela que o aviso tocado pede (`data.url`), com o app aberto ou
 * acordado por ele, e responde os botões dos avisos do dia (E2, E3). Espera a
 * sessão: antes dela, o guarda de autenticação mandaria para o login logo
 * depois, e o toque se perdia.
 *
 * Cada toque abre uma vez só: a última resposta continua a mesma até o
 * próximo toque, e cada re-render a reabriria.
 *
 * @example useNotificationTap(isLoading ? null : (session?.user.id ?? null));
 */
export function useNotificationTap(userId: string | null): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !response) return;
    const { request, date } = response.notification;
    const id = request.identifier + date + response.actionIdentifier;
    if (opened.current === id) return;
    opened.current = id;
    const notice = noticeDataOf(request.content.data);
    // Tocar já é responder: o aviso não conta como ignorado (E6).
    if (notice) useNoticeChoicesStore.getState().respond(request.identifier);
    if (notice && response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      handleNoticeAction(userId, response.actionIdentifier, notice)
        .then((route) => route && router.push(route as Href))
        .catch(() => registrarFalha('notices.action'));
      return;
    }
    const route = routeOfNotification(request.content.data);
    if (route) router.push(route as Href);
  }, [userId, response, router]);
}
