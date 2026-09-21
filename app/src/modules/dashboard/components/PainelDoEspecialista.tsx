import type { Briefing, BriefingSignalKind } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AvatarDoCabecalho } from '@/components/ui/AvatarDoCabecalho';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors as brandColors } from '@/constants/colors';
import { ROUTES } from '@/navigation/types';
import { comOpacidade, useCores } from '@/shared/design';

const ICONE_DO_SINAL: Record<BriefingSignalKind, keyof typeof Ionicons.glyphMap> = {
  inactive: 'alert-circle',
  pending_invite: 'mail-unread',
  anamnesis_ready: 'sparkles',
};

/**
 * A Home do especialista.
 *
 * Saiu de `(tabs)/index.tsx` porque é outra tela inteira dentro do mesmo
 * arquivo: outro papel, outros dados, e nenhuma sobreposição com a do aluno
 * além do `if` que as separava. O arquivo passava de 500 linhas, e a #194
 * pedia mais um cartão na Home do aluno — extrair a metade que não ia crescer
 * era o caminho mais curto e o mais honesto.
 */
interface PainelDoEspecialistaProps {
  profile: { full_name?: string | null } | null;
  students: unknown[];
  briefing: Briefing | null;
  aderenciaMedia: number | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function PainelDoEspecialista({
  profile,
  students,
  briefing,
  aderenciaMedia,
  isLoading,
  onRefresh,
}: PainelDoEspecialistaProps) {
  const router = useRouter();
  const cores = useCores();
  const emRisco = briefing?.signals.filter((sinal) => sinal.tone === 'danger').length ?? 0;

  return (
    <ScreenLayout>
      {/* Ambient Top Light - Made extremely subtle */}
      <View className="absolute top-0 w-full h-[12.5rem] pointer-events-none opacity-20">
        <LinearGradient colors={[brandColors.primary.start, 'transparent']} style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={brandColors.primary.start}
          />
        }
      >
        <View className="mb-8 flex-row justify-between items-start">
          <View>
            <Text className="text-zinc-500 text-[0.75rem] font-bold mb-1 uppercase tracking-widest font-sans ml-1">
              Central de Comando
            </Text>
            <Text className="text-4xl font-extrabold text-white mb-2 font-display">Dashboard</Text>
          </View>
          <AvatarDoCabecalho profile={profile} />
        </View>

        <View className="gap-y-4">
          {/* Stats Grid */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push(ROUTES.TABS.STUDENTS)}
              activeOpacity={0.8}
              className="flex-1"
            >
              <View
                className="rounded-2xl p-4 border bg-zinc-900"
                style={{ borderColor: brandColors.border.default }}
              >
                <Text className="text-white text-3xl font-black font-display tracking-tight">
                  {students.length}
                </Text>
                <Text className="text-zinc-500 text-[0.5625rem] font-bold tracking-widest uppercase font-sans mt-1">
                  Alunos Ativos
                </Text>
              </View>
            </TouchableOpacity>

            <View
              className="flex-1 rounded-2xl p-4 border bg-zinc-900"
              style={{ borderColor: brandColors.border.default }}
            >
              <Text
                className="text-3xl font-black font-display tracking-tight"
                style={{ color: cores.primaryText }}
              >
                {aderenciaMedia === null ? '—' : `${aderenciaMedia}%`}
              </Text>
              <Text className="text-zinc-500 text-[0.5625rem] font-bold tracking-widest uppercase font-sans mt-1">
                Aderência
              </Text>
            </View>

            <View
              className="flex-1 rounded-2xl p-4 border bg-zinc-900"
              style={{ borderColor: brandColors.border.default }}
            >
              <Text
                className="text-3xl font-black font-display tracking-tight"
                style={{ color: cores.destructive }}
              >
                {emRisco}
              </Text>
              <Text className="text-zinc-500 text-[0.5625rem] font-bold tracking-widest uppercase font-sans mt-1">
                Em Risco
              </Text>
            </View>
          </View>

          {briefing && briefing.signals.length > 0 ? (
            <View>
              <Text className="text-zinc-500 text-[0.6875rem] font-bold tracking-widest uppercase font-sans mb-2 ml-1">
                Alertas da IA
              </Text>
              <View className="gap-y-2">
                {briefing.signals.map((sinal) => {
                  const cor =
                    sinal.tone === 'danger'
                      ? cores.destructive
                      : sinal.tone === 'success'
                        ? cores.success
                        : cores.warning;
                  return (
                    <TouchableOpacity
                      key={`${sinal.studentId}-${sinal.kind}`}
                      onPress={() => router.push(ROUTES.STUDENTS.DETAILS(sinal.studentId))}
                      activeOpacity={0.8}
                    >
                      <View
                        className="rounded-2xl p-3.5 border bg-zinc-900 flex-row items-center gap-3"
                        style={{ borderColor: brandColors.border.default }}
                      >
                        <View
                          className="w-9 h-9 rounded-xl items-center justify-center"
                          style={{ backgroundColor: comOpacidade(cor, 0.15) }}
                        >
                          <Ionicons name={ICONE_DO_SINAL[sinal.kind]} size={18} color={cor} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-sm font-bold font-display">
                            {sinal.studentName}
                          </Text>
                          <Text className="text-zinc-400 text-xs font-sans mt-0.5">
                            {sinal.message}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Ranking Card - Full Width */}
          <TouchableOpacity onPress={() => router.push(ROUTES.TABS.RANKING)} activeOpacity={0.8}>
            <View
              className="rounded-[1.5rem] p-5 flex-row items-center justify-between border bg-zinc-900"
              style={{ borderColor: brandColors.border.default }}
            >
              <View className="flex-row items-center gap-4">
                <View className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                  <Ionicons name="trophy" size={24} color={cores.warning} />
                </View>
                <View>
                  <Text className="text-white text-lg font-black font-display tracking-tight">
                    Ranking de Elite 🏆
                  </Text>
                  <Text className="text-zinc-500 text-[0.625rem] font-bold tracking-widest uppercase font-sans">
                    Competição Semanal
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={brandColors.text.muted} />
            </View>
          </TouchableOpacity>

          {/* Quick Action - Premium Solid Button */}
          <TouchableOpacity
            onPress={() => router.push(ROUTES.STUDENTS.CREATE)}
            activeOpacity={0.8}
            className="mt-2 text-center"
          >
            <View style={{ borderRadius: 24, overflow: 'hidden' }}>
              <LinearGradient
                colors={[brandColors.primary.start, brandColors.primary.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="p-5 flex-row items-center justify-center shadow-lg shadow-orange-500/30"
              >
                <Ionicons name="person-add" size={22} color="white" style={{ marginRight: 10 }} />
                <Text className="text-white text-base font-black font-display uppercase tracking-widest">
                  Novo Aluno
                </Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
