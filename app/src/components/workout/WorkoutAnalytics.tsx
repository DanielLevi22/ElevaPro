import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { LoadEvolutionChart } from './LoadEvolutionChart';
import { WorkoutAnalyticsService, type WorkoutStats } from './WorkoutAnalyticsService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;

const EmptyState = ({ text }: { text: string }) => (
  <View className="h-full justify-center items-center">
    <Text className="text-zinc-600 text-xs">{text}</Text>
  </View>
);

// 1. Volume by Muscle (Bar Chart)
const VolumeByMuscleChart = ({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) => {
  if (!data.length) return <EmptyState text="Sem dados de volume" />;

  const maxValue = Math.max(...data.map((d) => d.value)) || 100;
  const barWidth = 32;

  const renderData = [
    ...data,
    ...Array(5 - data.length).fill({ label: '-', value: 0, color: '#333' }),
  ].slice(0, 5);

  return (
    <View className="items-center h-full justify-between pb-4">
      <View className="flex-row items-end h-[120px] w-full justify-between px-4">
        {renderData.map((item, index) => (
          <View key={`bar-${item.label}-${index.toString()}`} className="items-center gap-2">
            <View className="h-full justify-end">
              <View
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  width: barWidth,
                  backgroundColor: item.color,
                  borderRadius: 6,
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View className="flex-row w-full justify-between px-1 mt-2">
        {renderData.map((item, index) => (
          <Text
            key={`label-${item.label}-${index.toString()}`}
            style={{ width: 24, fontSize: 8, textAlign: 'center', color: '#71717A' }}
            numberOfLines={1}
          >
            {item.label.substring(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
};

// 2. Weekly Load (Area Chart)
const WeeklyLoadChart = ({ data }: { data: { weekLabel: string; load: number }[] }) => {
  if (!data.length || data.length < 2)
    return <EmptyState text="Dados insuficientes (min 2 semanas)" />;

  const width = CHART_WIDTH;
  const height = 120;

  const loads = data.map((d) => d.load);
  const max = Math.max(...loads) || 100;
  const min = Math.min(...loads) * 0.8;
  const range = max - min || 1;

  const points = loads.map((val, i) => {
    const x = (i / (loads.length - 1)) * (width - 20) + 10;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });

  const dLine = `M ${points.join(' L ')}`;
  const dArea = `${dLine} L ${width - 10},${height} L 10,${height} Z`;

  const totalVolume = loads.reduce((a, b) => a + b, 0);
  const last = loads[loads.length - 1];
  const prev = loads.length > 1 ? loads[loads.length - 2] : last;
  const improvement = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  return (
    <View className="justify-end h-full w-full pb-4">
      <Svg width={width} height={height}>
        <title>Gráfico de Carga Semanal</title>
        <Defs>
          <SvgLinearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FACC15" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#FACC15" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={dArea} fill="url(#goldGradient)" />
        <Path
          d={dLine}
          fill="none"
          stroke="#FACC15"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const [cx, cy] = p.split(',');
          return (
            <Circle
              key={`point-${data[i].weekLabel}`}
              cx={cx}
              cy={cy}
              r="4"
              fill="#18181B"
              stroke="#FACC15"
              strokeWidth="2"
            />
          );
        })}
      </Svg>

      <View className="flex-row justify-between px-2 mt-4">
        <View>
          <Text className="text-zinc-500 text-[10px] uppercase font-bold">
            Total (Últimas 7 sem)
          </Text>
          <Text className="text-white font-black text-xl">
            {(totalVolume / 1000).toFixed(1)}k kg
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-zinc-500 text-[10px] uppercase font-bold">vs. Semana anterior</Text>
          <Text
            className={`font-bold text-lg ${improvement >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
          >
            {improvement > 0 ? '+' : ''}
            {improvement.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

// 3. Stimulus Distribution (Donut)
const StimulusChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  if (!data.length) return <EmptyState text="Sem dados de estímulo" />;

  const size = 80;
  const center = size / 2;
  const radius = 30;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = 0;

  return (
    <View className="flex-row items-center gap-4">
      <View className="relative w-[80px] h-[80px] items-center justify-center">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <title>Distribuição de Estímulos</title>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {data.map((item) => {
              const strokeDasharray = `${item.value * circumference} ${circumference}`;
              const strokeDashoffset = -currentAngle * circumference;
              currentAngle += item.value;
              return (
                <Circle
                  key={item.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>
      </View>
      <View className="gap-1">
        {data.map((s) => (
          <View key={s.label} className="flex-row items-center gap-2">
            <View style={{ width: 8, height: 8, backgroundColor: s.color, borderRadius: 2 }} />
            <Text className="text-zinc-400 text-[10px]">
              {s.label} ({Math.round(s.value * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export function WorkoutAnalytics({ studentId }: { studentId?: string }) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<WorkoutStats | null>(null);

  const targetId = studentId || user?.id;

  useFocusEffect(
    useCallback(() => {
      if (targetId) {
        WorkoutAnalyticsService.getWorkoutStats(targetId).then(setStats);
      }
    }, [targetId])
  );

  if (!stats) return null;

  return (
    <Animated.View entering={FadeInDown.delay(500).springify()} className="mb-8">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-white text-xl font-bold font-display">
          SUA EVOLUÇÃO <Text className="text-zinc-500">EM NÚMEROS</Text>
        </Text>
        <Text className="text-orange-500 text-xs font-bold bg-orange-500/10 self-start px-2 py-1 rounded-md mt-2">
          ESTATÍSTICAS COMPLETAS
        </Text>
      </View>

      {/* Stack (Vertical) */}
      <View className="gap-6">
        {/* 1. Volume per Muscle */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full h-64 justify-between">
          <Text className="text-white text-sm font-bold leading-tight uppercase tracking-wider text-zinc-400">
            Volume por grupo muscular
          </Text>
          <VolumeByMuscleChart data={stats.volumeByMuscle} />
        </View>

        {/* 2. Total Load */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full h-64 justify-between">
          <Text className="text-white text-sm font-bold leading-tight uppercase tracking-wider text-zinc-400">
            Carga total levantada por semana
          </Text>
          <WeeklyLoadChart data={stats.weeklyLoad} />
        </View>

        {/* 3. Stimulus Distribution */}
        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full h-64 justify-between">
          <Text className="text-white text-sm font-bold leading-tight uppercase tracking-wider text-zinc-400">
            Distribuição dos estímulos
          </Text>
          <StimulusChart data={stats.stimulus} />
        </View>

        {/* 4. Load Evolution (New Feature) */}
        {targetId && <LoadEvolutionChart studentId={targetId} />}
      </View>
    </Animated.View>
  );
}
