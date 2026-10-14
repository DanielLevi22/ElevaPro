import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { TodayWidget } from '../TodayWidget';
import type { TodaySnapshot } from '../todaySnapshot';
import { readTodaySnapshot } from '../todayWidgetStore';
import { todayWidgetTaskHandler, updateTodayWidget } from '../updateTodayWidget';

jest.mock('react-native-mmkv', () => {
  const memory = new Map<string, string>();
  return {
    createMMKV: () => ({
      getString: (key: string) => memory.get(key),
      set: (key: string, value: string) => memory.set(key, value),
      remove: (key: string) => memory.delete(key),
    }),
  };
});
jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  requestWidgetUpdate: jest.fn(),
}));

const SNAPSHOT: TodaySnapshot = {
  date: '2026-10-14',
  hidden: false,
  pending: 2,
  workout: { id: 'b', title: 'Treino B - Costas', done: false },
  nextMeal: { name: 'Almoço', time: '12:00' },
  waterMl: 1250,
};

/** Os textos e os links da árvore do widget, sem desenhar nada nativo. */
function walk(node: ReactNode, out: { texts: string[]; uris: string[] }) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
    return out;
  }
  if (!isValidElement(node)) return out;
  const element = node as ReactElement<Record<string, unknown>>;
  if (typeof element.type === 'function') {
    return walk((element.type as (props: unknown) => ReactNode)(element.props), out);
  }
  const { text, clickActionData, children } = element.props;
  if (typeof text === 'string') out.texts.push(text);
  const uri = (clickActionData as { uri?: string } | undefined)?.uri;
  if (uri) out.uris.push(uri);
  return walk(children as ReactNode, out);
}

const contentOf = (snapshot: TodaySnapshot | null) =>
  walk(<TodayWidget snapshot={snapshot} />, { texts: [], uris: [] });

describe('TodayWidget (F7)', () => {
  it('com detalhes: o treino, a próxima refeição e a água, com o toque certo em cada um', () => {
    const { texts, uris } = contentOf(SNAPSHOT);
    expect(texts).toEqual(expect.arrayContaining(['Treino B', 'Almoço · 12:00', 'Água · 1,3 L']));
    expect(uris).toEqual([
      'elevapro://workouts/execute/b',
      'elevapro://nutrition',
      'elevapro://nutrition',
    ]);
  });

  // Art. 6°, VII: a tela inicial é vista por qualquer um que pegue o celular.
  it('com detalhes escondidos, só a contagem: nem treino, nem refeição, nem água', () => {
    const { texts } = contentOf({ ...SNAPSHOT, hidden: true });
    const shown = texts.join(' ');
    for (const leaked of ['Treino', 'Costas', 'Almoço', 'Água']) {
      if (shown.includes(leaked)) {
        throw new Error(`WIDGET COM DETALHE: "${leaked}" apareceu com detalhes escondidos`);
      }
    }
    expect(texts).toContain('Você tem 2 pendências hoje');
  });

  it('sem retrato, pede para abrir o app', () => {
    expect(contentOf(null).texts).toContain('Abra o Eleva Pro');
  });
});

describe('updateTodayWidget', () => {
  const setOS = (os: string) => {
    (Platform as { OS: string }).OS = os;
  };
  beforeEach(() => jest.clearAllMocks());

  it('no Android, guarda o retrato e pede o redesenho', async () => {
    setOS('android');
    await updateTodayWidget(SNAPSHOT);
    expect(readTodaySnapshot()).toEqual(SNAPSHOT);
    expect(requestWidgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ widgetName: 'Today' })
    );
  });

  it('nulo apaga o retrato: é a saída da conta', async () => {
    setOS('android');
    await updateTodayWidget(SNAPSHOT);
    await updateTodayWidget(null);
    expect(readTodaySnapshot()).toBeNull();
  });

  it('no iPhone não faz nada: o widget do iOS é da #381', async () => {
    setOS('ios');
    await updateTodayWidget(SNAPSHOT);
    expect(requestWidgetUpdate).not.toHaveBeenCalled();
  });

  it('com o app fechado, o Android acorda o widget e ele desenha o último retrato', async () => {
    setOS('android');
    await updateTodayWidget(SNAPSHOT);
    const renderWidget = jest.fn();

    await todayWidgetTaskHandler({
      widgetAction: 'WIDGET_UPDATE',
      renderWidget,
      widgetInfo: {} as never,
    });

    expect(renderWidget.mock.calls[0][0].props.snapshot).toEqual(SNAPSHOT);
  });
});
