import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { routeOfNotification } from '@/services/notificationService';

/**
 * Abre a tela que o aviso tocado pede (`data.url`), com o app aberto ou
 * acordado por ele. Espera a sessão: antes dela, o guarda de autenticação
 * mandaria para o login logo depois, e o toque se perdia.
 *
 * Cada toque abre uma vez só: a última resposta continua a mesma até o
 * próximo toque, e cada re-render a reabriria.
 *
 * @example useNotificationTap(!isLoading && Boolean(session));
 */
export function useNotificationTap(ready: boolean): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !response) return;
    const id = response.notification.request.identifier + response.notification.date;
    if (opened.current === id) return;
    const route = routeOfNotification(response.notification.request.content.data);
    if (!route) return;
    opened.current = id;
    router.push(route as Href);
  }, [ready, response, router]);
}
