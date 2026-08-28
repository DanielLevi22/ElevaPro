import type { PhysicalAssessment as PhysicalAssessmentRecord } from '@elevapro/shared';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/navigation/types';
import { PhysicalAssessmentService } from '../services/physicalAssessmentService';
import { useAssessmentStore } from '../store/assessmentStore';

const MetricCard = ({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}) => (
  <View className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 mb-4">
    <View className="p-2 rounded-xl mb-2 self-start" style={{ backgroundColor: `${color}20` }}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text className="text-zinc-400 text-xs uppercase font-medium tracking-wider mb-1">{label}</Text>
    <View className="flex-row items-baseline">
      <Text className="text-white text-2xl font-black">{value}</Text>
      {value !== '—' && <Text className="text-zinc-500 text-sm ml-1">{unit}</Text>}
    </View>
  </View>
);

function fmt(v: number | null, decimals = 0): string {
  return v !== null ? v.toFixed(decimals) : '—';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PhysicalAssessment() {
  const router = useRouter();
  const { studentId } = useAssessmentStore();
  const [assessment, setAssessment] = useState<PhysicalAssessmentRecord | null>(null);

  useEffect(() => {
    if (!studentId) return;
    // A avaliação física não guarda foto: as colunas `photo_*` nunca existiram
    // no banco, e a imagem da análise por IA também não é persistida
    // (`ADR-010`). O carregamento de URLs assinadas foi removido.
    PhysicalAssessmentService.getLatest(studentId)
      .then(setAssessment)
      .catch((error) => {
        console.log('[PhysicalAssessment] Falha ao carregar:', String(error));
      });
  }, [studentId]);

  const circumferences = assessment
    ? [
        { label: 'Pescoço', value: fmt(assessment.circ_neck), icon: 'human' },
        { label: 'Ombros', value: fmt(assessment.circ_shoulder), icon: 'human-handsup' },
        { label: 'Tórax', value: fmt(assessment.circ_chest), icon: 'human-male' },
        { label: 'Cintura', value: fmt(assessment.circ_waist), icon: 'human-male-board' },
        { label: 'Abdômen', value: fmt(assessment.circ_abdomen), icon: 'stomach' },
        { label: 'Quadril', value: fmt(assessment.circ_hip), icon: 'human-male' },
        { label: 'Braço Dir.', value: fmt(assessment.circ_right_arm), icon: 'arm-flex' },
        { label: 'Braço Esq.', value: fmt(assessment.circ_left_arm), icon: 'arm-flex' },
        {
          label: 'Antebraço Dir.',
          value: fmt(assessment.circ_right_forearm),
          icon: 'arm-flex-outline',
        },
        {
          label: 'Antebraço Esq.',
          value: fmt(assessment.circ_left_forearm),
          icon: 'arm-flex-outline',
        },
        { label: 'Coxa Dir.', value: fmt(assessment.circ_right_thigh), icon: 'run' },
        { label: 'Coxa Esq.', value: fmt(assessment.circ_left_thigh), icon: 'run' },
        { label: 'Panturrilha Dir.', value: fmt(assessment.circ_right_calf), icon: 'run-fast' },
        { label: 'Panturrilha Esq.', value: fmt(assessment.circ_left_calf), icon: 'run-fast' },
      ]
    : [];

  const skinfolds = assessment
    ? [
        { label: 'Tricipital', value: fmt(assessment.skinfold_tricep) },
        { label: 'Subescapular', value: fmt(assessment.skinfold_subscapular) },
        { label: 'Suprailíaca', value: fmt(assessment.skinfold_suprailiac) },
        { label: 'Abdominal', value: fmt(assessment.skinfold_abdomen) },
        { label: 'Coxa', value: fmt(assessment.skinfold_thigh) },
        { label: 'Peitoral', value: fmt(assessment.skinfold_chest) },
      ]
    : [];

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Header */}
      <View className="px-6 mb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-zinc-400 text-sm">Última avaliação</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="calendar-outline" size={14} color={colors.primary.solid} />
              <Text className="text-white text-lg font-bold ml-2">
                {fmtDate(assessment?.assessed_at ?? null)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(ROUTES.ASSESSMENT.ANAMNESIS)}
            className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700"
          >
            <Text className="text-white font-bold text-sm">Anamnese</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty state */}
      {!assessment && (
        <View className="px-6 py-12 items-center">
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={48}
            color={colors.text.muted}
          />
          <Text className="text-zinc-400 text-center mt-4 text-sm">
            Nenhuma avaliação registrada ainda.{'\n'}Realize o escaneamento corporal pela aba I.A.
            Vision.
          </Text>
        </View>
      )}

      {assessment && (
        <>
          {/* Main Stats */}
          <View className="px-6 flex-row flex-wrap justify-between">
            <View className="w-[48%]">
              <MetricCard
                label="Peso"
                value={fmt(assessment.weight_kg, 1)}
                unit="kg"
                icon="scale-bathroom"
                color={colors.secondary.main}
              />
            </View>
            <View className="w-[48%]">
              <MetricCard
                label="Altura"
                value={fmt(assessment.height_cm, 2)}
                unit="m"
                icon="human-male-height"
                color={colors.primary.start}
              />
            </View>
          </View>

          {/* Circumferences */}
          {circumferences.some((c) => c.value !== '—') && (
            <View className="px-6 mt-6">
              <View className="flex-row items-center mb-4">
                <View
                  className="w-1 h-6 mr-3 rounded-full"
                  style={{ backgroundColor: colors.accent.main }}
                />
                <Text className="text-white text-lg font-bold">Circunferências</Text>
              </View>
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
                {circumferences
                  .filter((item) => item.value !== '—')
                  .map((item) => (
                    <View
                      key={item.label}
                      className="flex-row items-center justify-between py-3 border-b border-white/5 last:border-0"
                    >
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons
                          name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                          size={18}
                          color={colors.accent.light}
                          style={{ marginRight: 12, opacity: 0.8 }}
                        />
                        <Text className="text-zinc-300 font-medium">{item.label}</Text>
                      </View>
                      <Text className="text-white font-bold">{item.value} cm</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Skinfolds */}
          {skinfolds.some((s) => s.value !== '—') && (
            <View className="px-6 mt-6">
              <View className="flex-row items-center mb-4">
                <View
                  className="w-1 h-6 mr-3 rounded-full"
                  style={{ backgroundColor: colors.status.info }}
                />
                <Text className="text-white text-lg font-bold">Dobras Cutâneas (mm)</Text>
              </View>
              <View className="flex-row flex-wrap justify-between">
                {skinfolds
                  .filter((item) => item.value !== '—')
                  .map((item) => (
                    <View
                      key={item.label}
                      className="w-[31%] bg-white/5 border border-white/10 rounded-xl p-3 mb-3 items-center"
                    >
                      <Text className="text-zinc-400 text-[10px] uppercase font-bold mb-1 text-center">
                        {item.label}
                      </Text>
                      <Text className="text-white text-lg font-bold">{item.value}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Comparative Photos */}
          <View className="px-6 mt-4">
            <View className="flex-row items-center mb-4">
              <View
                className="w-1 h-6 mr-3 rounded-full"
                style={{ backgroundColor: colors.primary.solid }}
              />
              <Text className="text-white text-lg font-bold">Fotos Comparativas</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            ></ScrollView>
          </View>

          {/* Notes from AI analysis */}
          {assessment.notes && (
            <View className="px-6 mt-6">
              <View className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <MaterialCommunityIcons
                    name="notebook-outline"
                    size={20}
                    color={colors.secondary.main}
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-white font-bold">Notas da Análise</Text>
                </View>
                <Text className="text-zinc-400 text-sm leading-6">{assessment.notes}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* History Button */}
      <View className="px-6 mt-8">
        <TouchableOpacity activeOpacity={0.8}>
          <LinearGradient
            colors={colors.gradients.secondary as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-xl items-center flex-row justify-center"
          >
            <MaterialCommunityIcons
              name="history"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-bold text-base uppercase tracking-wider">
              Histórico Completo
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
