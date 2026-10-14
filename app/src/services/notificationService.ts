import type { NoticeKind, ScheduledNotice } from '@elevapro/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { showConfirm } from '@/components/ui/appAlert';
import { showPushBanner } from '@/components/ui/pushBanner';
import { ROUTES } from '@/navigation/types';
import { coresDoTema } from '@/shared/design';
import { isExactAlarmGranted, openExactAlarmSettings } from '../../modules/exact-alarm-permission';
import { pushBannerFromNotification } from './pushBannerFromNotification';

/**
 * O banner nativo do SO não é mais quem desenha a notificação em primeiro
 * plano — é o `PushBanner` (issue #336), que dá o mesmo visual pra tudo:
 * lembrete existente ou sinal novo do especialista. `shouldShowBanner: false`
 * só afeta a apresentação em primeiro plano; app fechado/em segundo plano
 * continua recebendo a notificação nativa normalmente — não tem outro jeito.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

/**
 * Troca o banner nativo pelo `PushBanner` quando a notificação chega com o
 * app já aberto. Só reage a notificação que carrega `tone`/`icon` reconhecido
 * — o que não é nosso (`pushBannerFromNotification` devolve `null`) não vira
 * balão, mas ainda soa e entra na lista do sistema.
 *
 * Chamar uma vez, na raiz do app — mesmo padrão do listener de auth em
 * `_layout.tsx`.
 */
export function registerForegroundBannerListener(): () => void {
  const subscription = Notifications.addNotificationReceivedListener((event) => {
    const balao = pushBannerFromNotification(event.request.content);
    if (balao) showPushBanner(balao);
  });

  return () => subscription.remove();
}

export const MEAL_CHANNEL_ID = 'meal-reminders';
export const WORKOUT_CHANNEL_ID = 'workout-reminders';

/**
 * Canais precisam existir antes de qualquer agendamento — uma notificação
 * enviada para canal inexistente é descartada pelo Android sem aviso.
 *
 * Criar canal não exige permissão, então isto roda mesmo se o usuário recusar:
 * se ele conceder depois, os canais já estão lá.
 */
async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const config = {
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    // A luz do canal não segue o tema do app — é o LED do aparelho, sempre no
    // mesmo tom. `escuro` porque é a paleta canônica da marca (ADR-0025).
    lightColor: coresDoTema('escuro').success,
  };

  await Notifications.setNotificationChannelAsync(MEAL_CHANNEL_ID, {
    name: 'Lembretes de refeição',
    ...config,
  });
  await Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL_ID, {
    name: 'Lembretes de treino',
    ...config,
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Notifications] Permissão não concedida — nada será entregue.');
      return false;
    }
  }

  promptExactAlarmIfNeeded();
  return true;
}

/**
 * Android 12+ entrega lembrete atrasado sem esta permissão extra — é a causa
 * raiz do bug relatado na #336 (ver `ExactAlarmPermissionModule.kt`).
 *
 * Uma vez por sessão, na porta: mesmo padrão do `HealthDataConsentGate`. Não
 * persiste recusa — quem recusou hoje ainda vê lembretes atrasados amanhã, e
 * perguntar de novo é mais barato que deixar isso invisível para sempre.
 */
function promptExactAlarmIfNeeded(): void {
  if (Platform.OS !== 'android' || isExactAlarmGranted()) return;

  showConfirm({
    title: 'Lembretes no horário certo',
    message:
      'O Android pede uma permissão extra para os lembretes de refeição e treino chegarem exatamente na hora marcada, em vez de atrasados. Conceder "Alarmes e lembretes"?',
    type: 'warning',
    confirmText: 'Abrir configurações',
    cancelText: 'Agora não',
    onConfirm: openExactAlarmSettings,
  });
}

const DAILY_NOTICE_KIND = 'daily-notice';
/** Onde o toque leva: a refeição abre a dieta, o treino abre os treinos. */
const NOTICE_URL: Record<NoticeKind, string> = {
  meal: ROUTES.TABS.NUTRITION,
  workout: ROUTES.TABS.WORKOUTS,
  comeback: ROUTES.TABS.WORKOUTS,
  busyWeek: ROUTES.BLOCK.BUSY_WEEK,
};

/** As ações no próprio aviso (E2, E3). O id é o que o toque devolve em `actionIdentifier`. */
export const NOTICE_ACTIONS = {
  mealDone: 'meal-done',
  mealOther: 'meal-other',
  mealSkip: 'meal-skip',
  workoutStart: 'workout-start',
  workoutShort: 'workout-short',
  workoutTomorrow: 'workout-tomorrow',
  workoutSkip: 'workout-skip',
} as const;

/** Só a refeição e o treino têm botões: o reengajamento só abre o app. */
const NOTICE_CATEGORY: Partial<Record<NoticeKind, string>> = {
  meal: 'notice-meal',
  workout: 'notice-workout',
};

/**
 * Os botões dos avisos, curtos: o Android corta o rótulo de três botões numa
 * linha ("Comi o do pla…"). Todos abrem o app: a resposta precisa da sessão para
 * gravar, e no Android a ação em segundo plano não tem o JS de pé.
 */
async function ensureNoticeCategories(): Promise<void> {
  const action = (identifier: string, buttonTitle: string) => ({
    identifier,
    buttonTitle,
    options: { opensAppToForeground: true },
  });
  await Notifications.setNotificationCategoryAsync('notice-meal', [
    action(NOTICE_ACTIONS.mealDone, 'Comi'),
    action(NOTICE_ACTIONS.mealOther, 'Outra coisa'),
    action(NOTICE_ACTIONS.mealSkip, 'Pulei'),
  ]);
  await Notifications.setNotificationCategoryAsync('notice-workout', [
    action(NOTICE_ACTIONS.workoutStart, 'Começar'),
    // O Android mostra três: "Hoje não" fica para o iOS, e no Android é deslizar o aviso.
    action(NOTICE_ACTIONS.workoutShort, 'Só 20 min'),
    action(NOTICE_ACTIONS.workoutTomorrow, 'Amanhã'),
    action(NOTICE_ACTIONS.workoutSkip, 'Hoje não'),
  ]);
}

/**
 * Troca os avisos do dia agendados pelos novos (#376, item G). Quem decide o
 * quê e quando é o `planNotices`; aqui só vira notificação do aparelho, na
 * data e hora locais.
 *
 * Com `withActions`, o aviso ganha os botões de E2 e E3.
 *
 * Cancela também o lembrete de refeição antigo, que tocava na hora da
 * refeição com os alimentos na tela bloqueada: quem atualiza o app não fica
 * com os dois.
 *
 * @example await scheduleDailyNotices(planNotices(estado, preferencias), { withActions: false });
 */
export async function scheduleDailyNotices(
  notices: readonly ScheduledNotice[],
  { withActions }: { withActions: boolean }
): Promise<void> {
  if (withActions) await ensureNoticeCategories();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    const data = notification.content.data;
    if (data?.kind === DAILY_NOTICE_KIND || data?.mealId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
  for (const notice of notices) {
    await Notifications.scheduleNotificationAsync({
      identifier: notice.id,
      content: {
        title: notice.title,
        body: notice.body,
        // Sem detalhes, sem botões: "Comi o do plano" num aviso que não diz qual
        // refeição marcaria uma às cegas.
        ...(withActions && NOTICE_CATEGORY[notice.kind]
          ? { categoryIdentifier: NOTICE_CATEGORY[notice.kind] }
          : {}),
        data: {
          kind: DAILY_NOTICE_KIND,
          noticeKind: notice.kind,
          refId: notice.refId,
          date: notice.date,
          url: NOTICE_URL[notice.kind],
          tone: 'info',
          icon: notice.kind === 'meal' ? 'utensils' : 'dumbbell',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: localInstant(notice.date, notice.minutes),
        channelId: notice.kind === 'meal' ? MEAL_CHANNEL_ID : WORKOUT_CHANNEL_ID,
      },
    });
  }
}

/** O dia e os minutos no fuso do aparelho. */
function localInstant(date: string, minutes: number): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

/**
 * O aviso de vitória (F1) na hora: com o app aberto, vira o balão de sucesso.
 *
 * @example await presentVictoryNotice({ title: 'Semana completa: 4 de 4', body: 'Sua sequência segue.' });
 */
export async function presentVictoryNotice(copy: { title: string; body: string }): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      ...copy,
      data: { kind: 'victory', tone: 'success', icon: 'dumbbell' },
      sound: true,
    },
    trigger: null,
  });
}

const DAILY_LOG_REMINDER_ID = 'daily-log-reminder';
const DAILY_LOG_HOUR = 20;

/**
 * Liga o lembrete diário das 20h para registrar o dia (A5b, #376): quem
 * registrou só parte da semana não tem dado para o ajuste, e o lembrete é o
 * que o desenho oferece no lugar da bronca. Sem dado de saúde no texto: ele
 * aparece na tela bloqueada.
 *
 * @example if (await scheduleDailyLogReminder()) mostrarLigado();
 */
export async function scheduleDailyLogReminder(): Promise<boolean> {
  if (!(await requestNotificationPermissions())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_LOG_REMINDER_ID,
    content: {
      title: 'Hora de registrar o dia',
      body: 'Marque o que você comeu hoje. Leva um minuto.',
      data: { kind: 'daily-log', tone: 'info', icon: 'utensils' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: DAILY_LOG_HOUR,
      minute: 0,
      channelId: MEAL_CHANNEL_ID,
    },
  });
  return true;
}

/** @example await cancelDailyLogReminder(); */
export async function cancelDailyLogReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_LOG_REMINDER_ID);
}

/** Se o lembrete das 20h está agendado. @example const ligado = await hasDailyLogReminder(); */
export async function hasDailyLogReminder(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((notification) => notification.identifier === DAILY_LOG_REMINDER_ID);
}

const WEEKLY_REPORT_ID = 'weekly-report';
/** Domingo, no `weekday` do expo-notifications: 1 é domingo. */
const SUNDAY = 1;
const WEEKLY_REPORT_HOUR = 18;
/** A rota do relatório, como em `ROUTES.CHECKIN.REPORT`; o toque no aviso abre ela. */
const WEEKLY_REPORT_URL = '/checkin/report';

/**
 * O aviso de domingo às 18h de que o relatório da semana chegou (#376, R0).
 *
 * Só agenda se a permissão já foi dada: quem chama é a tela inicial, e ela não
 * é lugar de pedir permissão. Agendar de novo troca o anterior, pelo mesmo
 * `identifier`. O texto é genérico de propósito: aparece na tela bloqueada, e
 * o número de treinos ou o peso da semana são dado de saúde.
 *
 * @example await scheduleWeeklyReportNotification();
 */
export async function scheduleWeeklyReportNotification(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_REPORT_ID,
    content: {
      title: 'Seu relatório da semana chegou',
      body: 'Veja como foi a semana e o que mudou no seu plano.',
      data: { kind: 'weekly-report', url: WEEKLY_REPORT_URL, tone: 'info', icon: 'dumbbell' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: SUNDAY,
      hour: WEEKLY_REPORT_HOUR,
      minute: 0,
      channelId: WORKOUT_CHANNEL_ID,
    },
  });
  return true;
}

/**
 * A rota que um aviso tocado pede, se ela for nossa: só caminho interno, nunca
 * URL de fora, para o conteúdo do aviso não abrir o que quiser.
 *
 * @example routeOfNotification({ url: '/checkin/report' }) // "/checkin/report"
 */
export function routeOfNotification(data: Record<string, unknown> | undefined): string | null {
  const url = data?.url;
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null;
}
