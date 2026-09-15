import { computeReadiness, type HealthDailyMetric } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { type HealthData, useHealthData } from '@/hooks/useHealthData';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { useCores } from '@/shared/design';
import { HealthMetricCard } from '../components/HealthMetricCard';
import { PrivacyNote } from '../components/PrivacyNote';
import { ReadinessCard } from '../components/ReadinessCard';
import { WeekBars } from '../components/WeekBars';
import { useHealthHistory } from '../hooks/useHealthHistory';
import { compareWithBaseline, lastSevenDays, type WeekBar } from '../services/dailyComparison';

export interface HealthTodayScreenProps {
  studentId: string;
  /** Aluno com especialista: o aviso de privacidade diz que o personal vê. */
  hasSpecialist: boolean;
}

/**
 * Tela 5 do kit: a Saúde do dia. A prontidão, os quatro blocos contra a média do
 * próprio Student, as barras de 7 dias de sono e FC de repouso e o aviso de quem vê.
 *
 * Hoje vem do relógio quando há leitura, e do banco quando não há; a base vem sempre
 * do banco, que é o mesmo dado que o especialista enxerga.
 *
 * @example <HealthTodayScreen studentId={user.id} hasSpecialist={false} />
 */
export function HealthTodayScreen({ studentId, hasSpecialist }: HealthTodayScreenProps) {
  const router = useRouter();
  const health = useHealthData();
  const history = useHealthHistory(studentId);
  const today = useToday(health, history.days);

  const refresh = async () => {
    await Promise.all([health.refetch(), history.reload()]);
  };

  return (
    <GlassScreen glow={HEALTH_GLOW} refresh={{ refreshing: false, onRefresh: refresh }}>
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
        <View className="min-w-0 flex-1 flex-row items-center gap-[0.5625rem]">
          <Text className="text-[1.3125rem] font-bold tracking-tight text-hero">Saúde do dia</Text>
          {health.source === 'device' ? <Chip tom="evolucao">Live</Chip> : null}
          {health.source === 'mock' ? <Chip tom="aviso">Simulado</Chip> : null}
        </View>
        <BotaoRedondo icone="refresh-cw" rotulo="Atualizar" onPress={refresh} />
      </View>

      <ReadinessCard readiness={today.readiness} />

      <TituloDeSecao estilo="rotulo">Hoje</TituloDeSecao>
      <TodayGrid today={today} />

      <TituloDeSecao estilo="rotulo" acao="7 dias">
        Sono
      </TituloDeSecao>
      <SleepWeek days={history.days} today={today.sleepMinutes} />
      <TituloDeSecao estilo="rotulo" acao="7 dias">
        FC de repouso
      </TituloDeSecao>
      <RestingHeartRateWeek days={history.days} today={today.restingHeartRate} />

      <TituloDeSecao estilo="rotulo">Relógio</TituloDeSecao>
      <LinhaDeVidro
        icon="watch-outline"
        tom="marca"
        titulo="Meu relógio"
        sub="Última leitura, permissões e diagnóstico"
        onPress={() => router.push(ROUTES.HEALTH.WATCH)}
      />
      <PrivacyNote hasSpecialist={hasSpecialist} />
    </GlassScreen>
  );
}

interface TodayValues {
  sleepMinutes: number | null;
  restingHeartRate: number | null;
  steps: number | null;
  calories: number | null;
  previous: HealthDailyMetric[];
  readiness: ReturnType<typeof computeReadiness>;
}

/**
 * Hoje do relógio, ou do banco quando o relógio não leu; e os dias anteriores, sem
 * hoje, que são a base da prontidão e das diferenças.
 */
function useToday(health: HealthData, days: HealthDailyMetric[]): TodayValues {
  const { source, sleepMinutes: deviceSleep, restingHeartRate: deviceHr, steps, calories } = health;
  return useMemo(() => {
    const todayKey = localDateKey();
    const row = days.find((day) => day.date === todayKey);
    const previous = days.filter((day) => day.date !== todayKey);
    const fromDevice = source !== 'unavailable';
    const sleepMinutes = deviceSleep ?? row?.sleep_minutes ?? null;
    const restingHeartRate = deviceHr ?? row?.resting_heart_rate ?? null;
    return {
      sleepMinutes,
      restingHeartRate,
      steps: fromDevice ? steps : (row?.steps ?? null),
      calories: fromDevice ? calories : (row?.active_calories ?? null),
      previous,
      readiness: computeReadiness(
        { sleepMinutes, restingHeartRate },
        previous.map((day) => ({
          sleepMinutes: day.sleep_minutes,
          restingHeartRate: day.resting_heart_rate,
        }))
      ),
    };
  }, [source, deviceSleep, deviceHr, steps, calories, days]);
}

function formatSleep(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

function TodayGrid({ today }: { today: TodayValues }) {
  const { previous } = today;
  return (
    <View className="gap-2.5">
      <View className="flex-row gap-2.5">
        <HealthMetricCard
          icon="moon"
          tone="sono"
          label="Sono"
          value={today.sleepMinutes === null ? '' : formatSleep(today.sleepMinutes)}
          hasReading={today.sleepMinutes !== null}
          comparison={compareWithBaseline(
            today.sleepMinutes,
            previous.map((day) => day.sleep_minutes)
          )}
          unitOfDifference="min"
          betterWhen="higher"
        />
        <HealthMetricCard
          icon="heart"
          tone="batimento"
          label="FC repouso"
          value={String(today.restingHeartRate ?? '')}
          unit="bpm"
          hasReading={today.restingHeartRate !== null}
          comparison={compareWithBaseline(
            today.restingHeartRate,
            previous.map((day) => day.resting_heart_rate)
          )}
          unitOfDifference="bpm"
          betterWhen="lower"
        />
      </View>
      <View className="flex-row gap-2.5">
        <HealthMetricCard
          icon="footsteps"
          tone="passos"
          label="Passos"
          value={(today.steps ?? 0).toLocaleString('pt-BR')}
          hasReading={today.steps !== null}
          comparison={compareWithBaseline(
            today.steps,
            previous.map((day) => day.steps)
          )}
          betterWhen="higher"
        />
        <HealthMetricCard
          icon="flame"
          tone="calorias"
          label="Calorias"
          value={String(today.calories ?? '')}
          unit="kcal"
          hasReading={today.calories !== null}
          comparison={compareWithBaseline(
            today.calories,
            previous.map((day) => day.active_calories)
          )}
          betterWhen="higher"
        />
      </View>
    </View>
  );
}

/**
 * A barra de hoje leva a leitura do aparelho: no iPhone e antes da sincronização, o
 * dia ainda não está no banco, e a barra mais importante da semana ficaria vazia.
 */
function withToday(bars: WeekBar[], today: number | null): WeekBar[] {
  if (today === null) return bars;
  return bars.map((bar, index) => (index === bars.length - 1 ? { ...bar, value: today } : bar));
}

function SleepWeek({ days, today }: { days: HealthDailyMetric[]; today: number | null }) {
  const cores = useCores();
  return (
    <WeekBars
      label="Sono dos últimos 7 dias"
      bars={withToday(
        lastSevenDays(days, new Date(), (day) => day.sleep_minutes),
        today
      )}
      color={cores.metricaSono}
      textColor={cores.textoSono}
      format={(minutes) => `${Math.round(minutes / 60)}h`}
    />
  );
}

function RestingHeartRateWeek({
  days,
  today,
}: {
  days: HealthDailyMetric[];
  today: number | null;
}) {
  const cores = useCores();
  return (
    <WeekBars
      label="FC de repouso dos últimos 7 dias"
      bars={withToday(
        lastSevenDays(days, new Date(), (day) => day.resting_heart_rate),
        today
      )}
      color={cores.metricaBatimento}
      textColor={cores.textoBatimento}
      format={(bpm) => String(bpm)}
    />
  );
}
