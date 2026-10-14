import { formatarDecimal } from '@elevapro/shared';
import { type ColorProp, FlexWidget, TextWidget } from 'react-native-android-widget';
import { coresDoTema } from '@/shared/design';
import type { TodaySnapshot } from './todaySnapshot';

/**
 * O widget é desenhado fora do React Native: o Android recebe a árvore pronta,
 * sem NativeWind, e as primitivas do widget só aceitam `style`. As cores vêm
 * dos tokens do tema escuro, a paleta da marca.
 */
const cores = coresDoTema('escuro');
const color = (value: string) => value as ColorProp;

const SCHEME = 'elevapro://';
const ML_PER_LITER = 1000;

/**
 * F7 · Hoje, na tela inicial do Android: o treino, a próxima refeição e a
 * água, com um toque para começar ou marcar. Com "esconder detalhes", só a
 * contagem do que falta.
 *
 * @example renderWidget(<TodayWidget snapshot={retrato} />)
 */
export function TodayWidget({ snapshot }: { snapshot: TodaySnapshot | null }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding: 14,
        borderRadius: 22,
        backgroundColor: color(cores.background),
      }}
    >
      <TextWidget
        text="HOJE"
        style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: color(cores.primary) }}
      />
      {!snapshot ? (
        <Line title="Abra o Eleva Pro" sub="para ver o seu dia aqui" />
      ) : snapshot.hidden ? (
        <Hidden pending={snapshot.pending} />
      ) : (
        <Details snapshot={snapshot} />
      )}
    </FlexWidget>
  );
}

function Hidden({ pending }: { pending: number }) {
  const title =
    pending === 0
      ? 'Tudo em dia'
      : pending === 1
        ? 'Você tem 1 pendência hoje'
        : `Você tem ${pending} pendências hoje`;
  return <Line title={title} sub="Toque para ver no app" />;
}

function Details({ snapshot }: { snapshot: TodaySnapshot }) {
  const { workout, nextMeal } = snapshot;
  return (
    <FlexWidget style={{ width: 'match_parent', flexGap: 8, marginTop: 8 }}>
      {workout ? (
        <Line
          title={workout.title.split(' - ')[0]}
          sub={workout.done ? 'Feito hoje' : 'Toque para começar'}
          uri={workout.done ? undefined : `${SCHEME}workouts/execute/${workout.id}`}
        />
      ) : (
        <Line title="Sem treino hoje" sub="Dia de descanso do plano" />
      )}
      {nextMeal ? (
        <Line
          title={`${nextMeal.name} · ${nextMeal.time}`}
          sub="Toque para marcar"
          uri={`${SCHEME}nutrition`}
        />
      ) : null}
      <Line
        title={`Água · ${formatarDecimal(snapshot.waterMl / ML_PER_LITER)} L`}
        sub="Toque para registrar"
        uri={`${SCHEME}nutrition`}
      />
    </FlexWidget>
  );
}

function Line({ title, sub, uri }: { title: string; sub: string; uri?: string }) {
  return (
    <FlexWidget
      clickAction={uri ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={uri ? { uri } : undefined}
      style={{ width: 'match_parent' }}
    >
      <TextWidget
        text={title}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 15, fontWeight: '700', color: color(cores.foreground) }}
      />
      <TextWidget text={sub} style={{ fontSize: 12, color: color(cores.mutedForeground) }} />
    </FlexWidget>
  );
}
