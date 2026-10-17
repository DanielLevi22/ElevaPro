import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandler } from 'react-native-android-widget';
import { registrarAviso } from '@/lib/registro';
import { TodayWidget } from './TodayWidget';
import type { TodaySnapshot } from './todaySnapshot';
import { clearTodaySnapshot, readTodaySnapshot, saveTodaySnapshot } from './todayWidgetStore';

/** O nome do widget no `app.json`: é como o Android o reconhece. */
export const TODAY_WIDGET = 'Today';

/**
 * Guarda o retrato do dia e redesenha o widget, se a pessoa tiver um na tela
 * inicial. Nulo apaga: é a saída da conta. Só no Android: o widget do iOS fica
 * para a sua issue.
 *
 * @example await updateTodayWidget(buildTodaySnapshot(estado, agua, esconder));
 */
export async function updateTodayWidget(snapshot: TodaySnapshot | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (snapshot) saveTodaySnapshot(snapshot);
  else clearTodaySnapshot();
  try {
    await requestWidgetUpdate({
      widgetName: TODAY_WIDGET,
      renderWidget: () => <TodayWidget snapshot={snapshot} />,
    });
  } catch {
    registrarAviso('widget.update_failed');
  }
}

/**
 * O Android acorda o widget com o app fechado (ao adicionar, a cada meia hora,
 * ao redimensionar): desenha o último retrato guardado, sem rede.
 *
 * @example registerWidgetTaskHandler(todayWidgetTaskHandler);
 */
export const todayWidgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  renderWidget(<TodayWidget snapshot={readTodaySnapshot()} />);
};
