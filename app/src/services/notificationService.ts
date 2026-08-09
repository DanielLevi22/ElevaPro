import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
    lightColor: '#00FF88',
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
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[Notifications] Permissão não concedida — nada será entregue.');
    return false;
  }

  return true;
}

interface MealNotification {
  mealId: string;
  mealName: string;
  mealTime: string; // Format: "HH:MM"
  dayOfWeek: number; // 0-6
  foodNames?: string[];
}

export async function scheduleMealNotifications(
  planId: string,
  meals: MealNotification[]
): Promise<void> {
  try {
    // NUCLEAR OPTION: Cancel ALL notifications to ensure no ghosts remain from previous attempts
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('☢️ CANCELLING ALL NOTIFICATIONS (Nuclear Option) to prevent duplicates');

    for (const meal of meals) {
      if (!meal.mealTime || meal.dayOfWeek === undefined || meal.dayOfWeek === null) {
        console.warn('Skipping invalid meal notification:', meal);
        continue;
      }

      const [hours, minutes] = meal.mealTime.split(':').map(Number);
      const dayOfWeek = Number(meal.dayOfWeek);

      if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(dayOfWeek)) {
        console.warn('Invalid time or day for meal:', meal);
        continue;
      }

      // Expo uses 1-7 (Sunday=1, Saturday=7)
      // Our DB uses 0-6 (Sunday=0, Saturday=6)
      const weekday = dayOfWeek + 1;

      if (weekday < 1 || weekday > 7) {
        console.warn('Invalid weekday calculated:', weekday, 'from dayOfWeek:', dayOfWeek);
        continue;
      }

      // Format body text
      let bodyText = `Não esqueça: ${meal.mealName || 'Refeição'}`;
      if (meal.foodNames && meal.foodNames.length > 0) {
        const foodsList = meal.foodNames.join(', ');
        bodyText += `\n${foodsList}`;
      }

      if (Platform.OS === 'android') {
        // Android doesn't support "weekly" repeating triggers reliably with expo-notifications
        // Strategy: Schedule individual notifications for the next 4 weeks
        const now = new Date();
        const weeksToSchedule = 4;

        for (let i = 0; i < weeksToSchedule; i++) {
          // Calculate date for this week's occurrence
          const targetDate = new Date();
          targetDate.setDate(now.getDate() + i * 7); // Move to future weeks

          // Adjust to the correct day of week
          // dayOfWeek: 0 (Sun) - 6 (Sat)
          // targetDate.getDay(): 0 (Sun) - 6 (Sat)
          const currentDay = targetDate.getDay();
          const daysUntilTarget = (dayOfWeek + 7 - currentDay) % 7;

          targetDate.setDate(targetDate.getDate() + daysUntilTarget);
          targetDate.setHours(hours, minutes, 0, 0);

          // Logs removed to reduce noise
          // if (targetDate.getTime() <= now.getTime()) { ... } logic remains
          if (targetDate.getTime() <= now.getTime()) {
            continue;
          }

          const trigger: Notifications.DateTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetDate,
            channelId: MEAL_CHANNEL_ID,
          };

          await Notifications.scheduleNotificationAsync({
            identifier: `${planId}-${meal.mealId}-${i}`, // Unique ID for each instance
            content: {
              title: '🍽️ Hora da refeição!',
              body: bodyText,
              data: { planId, mealId: meal.mealId },
              sound: true,
            },
            trigger,
          });
        }
      } else {
        // iOS supports weekly repeating triggers
        const trigger: Notifications.CalendarTriggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
          weekday: weekday,
        };

        await Notifications.scheduleNotificationAsync({
          identifier: `${planId}-${meal.mealId}`,
          content: {
            title: '🍽️ Hora da refeição!',
            body: `Não esqueça: ${meal.mealName || 'Refeição'}`,
            data: { planId, mealId: meal.mealId },
            sound: true,
          },
          trigger,
        });
      }
    }

    console.log(`Scheduled ${meals.length} meal notifications for plan ${planId}`);
  } catch (error) {
    console.error('Error scheduling meal notifications:', error);
  }
}

export async function cancelPlanNotifications(planId: string): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    const notificationsToCancel = scheduledNotifications
      .filter((n) => n.identifier.startsWith(`${planId}-`))
      .map((n) => n.identifier);

    if (notificationsToCancel.length > 0) {
      for (const id of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      console.log(`Cancelled ${notificationsToCancel.length} notifications for plan ${planId}`);
    }
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

export async function scheduleWorkoutReminder(hour: number = 8, minute: number = 0): Promise<void> {
  try {
    // Schedule daily workout reminder
    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    };

    if (Platform.OS === 'android') {
      // Android needs specific trigger type for calendar-like repetition if not using interval
      // However, simple daily trigger is supported via SchedulableTriggerInputTypes.DAILY (if available/mapped)
      // Or manually scheduling for next instances.
      // Let's use the explicit Daily trigger object if utilizing expo-notifications types directly
      await Notifications.scheduleNotificationAsync({
        identifier: 'daily-workout-reminder',
        content: {
          title: '🏋️ Hora do Treino!',
          body: 'Seu corpo alcançar o que sua mente acredita. Vamos treinar?',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: WORKOUT_CHANNEL_ID,
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        identifier: 'daily-workout-reminder',
        content: {
          title: '🏋️ Hora do Treino!',
          body: 'Seu corpo alcançar o que sua mente acredita. Vamos treinar?',
          sound: true,
        },
        trigger,
      });
    }

    console.log(
      `Scheduled daily workout reminder for ${hour}:${minute < 10 ? `0${minute}` : minute}`
    );
  } catch (error) {
    console.error('Error scheduling workout reminder:', error);
  }
}

export async function schedulePostWorkoutReminder(): Promise<void> {
  try {
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 30 * 60 * 1000),
      channelId: WORKOUT_CHANNEL_ID,
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💪 Hora do Pós-Treino!',
        body: 'Não esqueça de fazer sua refeição pós-treino para maximizar seus resultados.',
        sound: true,
      },
      trigger,
    });
    console.log('Scheduled post-workout reminder for 30 minutes from now');
  } catch (error) {
    console.error('Error scheduling post-workout reminder:', error);
  }
}
