import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Vidro } from '@/components/ui/Vidro';
import { registrarAviso } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { scheduleWeeklyReportNotification } from '@/services/notificationService';
import { useWeeklyReport } from '../hooks/useWeeklyReport';
import { showReportCard } from '../services/reportCardVisibility';
import { reportHeadline, reportNumbers } from '../services/reportCopy';
import { useWeeklyReportStore } from '../store/weeklyReportStore';

/**
 * R0 · O relatório da semana na tela inicial, de domingo a terça, até ser
 * aberto. Também deixa o aviso de domingo agendado: é a tela que todo aluno
 * abre, e agendar de novo só troca o anterior.
 *
 * @example <HomeDoAluno dados={aluno} aviso={<WeeklyReportCard />} />
 */
export function WeeklyReportCard() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const { data: report, today } = useWeeklyReport(userId);
  const seenWeek = useWeeklyReportStore((state) => (userId ? state.seenWeek[userId] : null));

  useEffect(() => {
    if (!userId) return;
    scheduleWeeklyReportNotification().catch(() => registrarAviso('checkin.schedule_report'));
  }, [userId]);

  if (!report || !showReportCard(report, today, seenWeek ?? null)) return null;
  const headline = reportHeadline(report, '');
  const numbers = reportNumbers(report);

  return (
    <Vidro classeExterna="mt-5" destaque className="gap-3 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-primary-text">
          Relatório da semana
        </Text>
        <Text className="text-[0.6875rem] text-hero-secondary">{headline.eyebrow}</Text>
      </View>
      <Text className="font-display-black text-[1.375rem] tracking-tight text-hero">
        {headline.short}
      </Text>
      <View className="flex-row gap-2">
        <Chip icon="barbell" value={numbers.workouts.value} label={numbers.workouts.sub} />
        <Chip
          icon="trophy-outline"
          value={String(report.records.length)}
          label={report.records.length === 1 ? 'recorde' : 'recordes'}
        />
        <Chip icon="scale-outline" value={numbers.weight.value} label="peso" />
      </View>
      <BotaoDeDestaque
        rotulo="Ver relatório"
        icone="arrow-forward"
        tamanho="cartao"
        onPress={() => router.push(ROUTES.CHECKIN.REPORT)}
      />
    </Vidro>
  );
}

function Chip({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-2xl bg-glass-strong p-2">
      <CaixaDeIcone icon={icon} tom="marca" tamanho="bloco" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-extrabold text-hero">
          {value}
        </Text>
        <Text numberOfLines={1} className="text-[0.65625rem] text-hero-secondary">
          {label}
        </Text>
      </View>
    </View>
  );
}
