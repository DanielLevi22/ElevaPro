import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
import { BodyScanResult } from '@/modules/assessment/types/assessment';

// Reusing the TabButton and helper components - ideally these should be shared, but for now inlining or importing would work.
// Since I can't easily import internal components from a screen file, I'll redefine TabButton here or imports if I move it to a component.
// For speed, I'll implement the Tab Switcher inline similar to AssessmentScreen.

import { PhysicalAssessment } from '@/assessment';

const { width } = Dimensions.get('window');

import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const TabButton = ({
  label,
  isActive,
  onPress,
  icon,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) => (
  <TouchableOpacity
    className="flex-1 flex-row items-center justify-center z-10 h-full"
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons
      name={icon}
      size={18}
      color={isActive ? '#FFF' : '#71717A'}
      style={{ marginRight: 8 }}
    />
    <Text className={`font-bold text-sm ${isActive ? 'text-white' : 'text-zinc-500'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function StudentAssessmentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const _insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('🔍 StudentAssessmentScreen | ID:', id);
  }, [id]);

  // Hide TabBar when this screen is active
  useLayoutEffect(() => {
    // We need to find the tab navigator parent.
    // Usually navigation.getParent() works if we are directly receiving the tab nav.
    // But since we might be in a stack inside tabs, we might need to go up.
    // However, the tab bar options are usually respected if set on the screen options of the stack which is a child of Tabs.
    // But modifying the parent navigator (Tabs) options from here is the most direct way.

    // Attempt to hide tab bar
    const parent = navigation.getParent();
    parent?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      parent?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const [activeTab, setActiveTab] = useState<'ai' | 'physical'>('ai');
  const [result] = useState<BodyScanResult | null>(null);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(activeTab === 'ai' ? 0 : (width - 48) / 2 - 2) }],
    };
  });

  return (
    <ScreenLayout className="bg-black">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-2 z-10">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white font-display">Avaliação Corporal</Text>
            <View className="w-10" />
          </View>

          {/* Tab Switcher */}
          <View className="h-12 bg-white/5 rounded-xl border border-white/10 flex-row relative mb-4 p-1">
            <Animated.View
              className="absolute top-1 left-1 bottom-1 w-[48%] bg-white/10 rounded-lg border border-white/5 shadow-sm"
              style={indicatorStyle}
            />
            <TabButton
              label="I.A. Vision"
              icon="scan-outline"
              isActive={activeTab === 'ai'}
              onPress={() => setActiveTab('ai')}
            />
            <TabButton
              label="Avaliação"
              icon="body-outline"
              isActive={activeTab === 'physical'}
              onPress={() => setActiveTab('physical')}
            />
          </View>
        </View>

        {activeTab === 'physical' ? (
          <PhysicalAssessment />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {/* New Assessment Action */}
            <View className="px-6 mt-6 mb-2">
              <TouchableOpacity
                className="w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/20"
                onPress={() =>
                  router.push({
                    pathname: '/assessment/body-scan',
                    params: { id: id },
                  } as never)
                }
              >
                <Ionicons name="scan" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-lg uppercase tracking-widest">
                  Nova Avaliação IA
                </Text>
              </TouchableOpacity>
            </View>

            {!result ? (
              <View className="items-center justify-center py-20">
                <Ionicons name="alert-circle-outline" size={64} color={colors.status.error} />
                <Text className="text-white text-lg font-bold mt-4">Avaliação não encontrada</Text>
              </View>
            ) : (
              <>
                {/* AI Posture Analysis - Pending Review */}
                <View className="px-6 mb-6 mt-4">
                  <Text className="text-zinc-400 text-xs font-bold uppercase mb-3">Pendências</Text>
                  <TouchableOpacity
                    className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex-row items-center justify-between"
                    onPress={() => router.push('/(tabs)/students/posture-analysis')}
                  >
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-yellow-500/20 rounded-full items-center justify-center mr-4 relative">
                        <MaterialCommunityIcons
                          name="clipboard-check-outline"
                          size={24}
                          color={colors.status.warning}
                        />
                        <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black" />
                      </View>
                      <View>
                        <Text className="text-white font-bold text-lg">
                          Nova Avaliação do Aluno
                        </Text>
                        <Text className="text-zinc-400 text-xs">
                          Enviada hoje às 14:30 • Requer Aprovação
                        </Text>
                      </View>
                    </View>
                    <View className="bg-yellow-500 py-1 px-3 rounded-full">
                      <Text className="text-black text-[10px] font-bold">REVISAR</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Date Badge */}
                <View className="items-center mb-8">
                  <View className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                    <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                      {new Date(result.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {/* Main Metrics Grid */}
                <View className="px-6 mb-8">
                  <Text className="text-white text-lg font-bold mb-4 font-display">
                    Composição Corporal
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    <MetricCard
                      label="Gordura Corporal"
                      value={`${result.metrics.bodyFat}%`}
                      icon="water-outline"
                      color={colors.status.warning}
                    />
                    <MetricCard
                      label="Massa magra"
                      value={
                        result.metrics.leanMass === null ? '—' : `${result.metrics.leanMass} kg`
                      }
                      icon="barbell-outline"
                      color={colors.status.success}
                    />
                    <MetricCard
                      label="IMC"
                      value={result.metrics.bmi.toFixed(1)}
                      icon="calculator-outline"
                      color={colors.secondary.main}
                    />
                    <MetricCard
                      label="Peso"
                      value={`${result.metrics.weight} kg`}
                      icon="scale-outline"
                      color="#A1A1AA"
                    />
                  </View>
                </View>

                {/* Tape Measurements */}
                <View className="px-6">
                  <Text className="text-white text-lg font-bold mb-4 font-display">
                    Medidas (cm)
                  </Text>
                  <View className="bg-white/5 rounded-2xl border border-white/10 p-4">
                    <MeasurementRow label="Peitoral" value={result.segments.chest} />
                    <MeasurementRow label="Cintura" value={result.segments.waist} />
                    <MeasurementRow label="Quadril" value={result.segments.hips} />
                    <MeasurementRow label="Braços" value={result.segments.arms} />
                    <MeasurementRow label="Coxas" value={result.segments.thighs} />
                    {result.segments.calves && (
                      <MeasurementRow label="Panturrilhas" value={result.segments.calves} />
                    )}
                  </View>
                </View>

                {/* Helper Note */}
                <View className="px-6 mt-8">
                  <View className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex-row gap-3">
                    <Ionicons name="information-circle" size={20} color={colors.secondary.main} />
                    <Text className="text-blue-200/80 text-sm flex-1 leading-5">
                      Estes resultados foram gerados por Inteligência Artificial a partir das
                      imagens escaneadas.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}

const MetricCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) => (
  <View className="bg-white/5 border border-white/10 p-4 rounded-2xl w-[48%] mb-1">
    <View
      className="w-8 h-8 rounded-full items-center justify-center mb-3"
      style={{ backgroundColor: `${color}20` }}
    >
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text className="text-zinc-400 text-xs font-bold uppercase mb-1">{label}</Text>
    <Text className="text-white text-xl font-bold">{value}</Text>
  </View>
);

const MeasurementRow = ({ label, value }: { label: string; value: number }) => (
  <View className="flex-row justify-between items-center py-3 border-b border-white/5 last:border-0">
    <Text className="text-zinc-400 font-medium">{label}</Text>
    <Text className="text-white font-bold text-lg">
      {value} <Text className="text-xs text-zinc-600">cm</Text>
    </Text>
  </View>
);
