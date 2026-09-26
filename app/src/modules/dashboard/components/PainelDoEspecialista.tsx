import type { Briefing, BriefingSignal, BriefingSignalKind } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { AvatarDoCabecalho } from '@/components/ui/AvatarDoCabecalho';
import { CaixaDeIcone, type TomDeMetrica } from '@/components/ui/CaixaDeIcone';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { StatTile } from '@/components/ui/StatTile';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';

const SIGNAL_ICON: Record<BriefingSignalKind, keyof typeof Ionicons.glyphMap> = {
  inactive: 'warning-outline',
  pending_invite: 'mail-unread-outline',
  anamnesis_ready: 'sparkles-outline',
};

/** O vermelho do kit para risco, a marca para boa notícia, o âmbar para o resto. */
const SIGNAL_TONE: Record<BriefingSignal['tone'], TomDeMetrica> = {
  danger: 'batimento',
  success: 'marca',
  warning: 'gordura',
};

/**
 * A Home do especialista — a tela 1 do fluxo do especialista no kit de vidro (#334).
 *
 * Saiu de `(tabs)/index.tsx` porque é outra tela inteira dentro do mesmo
 * arquivo: outro papel, outros dados, e nenhuma sobreposição com a do aluno
 * além do `if` que as separava.
 *
 * A seção "Hoje" do kit (agenda do dia) não está aqui: o app não tem agenda, e
 * horário inventado seria pior que a seção ausente.
 */
interface PainelDoEspecialistaProps {
  profile: { full_name?: string | null } | null;
  students: unknown[];
  briefing: Briefing | null;
  averageAdherence: number | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function PainelDoEspecialista({
  profile,
  students,
  briefing,
  averageAdherence,
  isLoading,
  onRefresh,
}: PainelDoEspecialistaProps) {
  const router = useRouter();
  const signals = briefing?.signals ?? [];
  const atRiskCount = signals.filter((signal) => signal.tone === 'danger').length;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <TelaDeVidroComFoto image={fotoDoGrupo('chest')} refresh={{ refreshing: isLoading, onRefresh }}>
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
            {todayLabel()}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-[1.375rem] font-bold tracking-tight text-hero"
          >
            {firstName ? `Olá, ${firstName}` : 'Olá'}
          </Text>
        </View>
        <AvatarDoCabecalho profile={profile} />
      </View>

      <TouchableOpacity
        onPress={() => router.push(ROUTES.TABS.STUDENTS)}
        activeOpacity={0.8}
        accessibilityRole="button"
        className="mt-[1.125rem] flex-row gap-2.5"
      >
        <StatTile value={String(students.length)} label="Alunos ativos" tone="brand" size="lg" />
        <StatTile
          value={averageAdherence === null ? '—' : `${averageAdherence}%`}
          label="Aderência"
          tone="info"
          size="lg"
        />
        <StatTile value={String(atRiskCount)} label="Em risco" tone="danger" size="lg" />
      </TouchableOpacity>

      {signals.length > 0 ? (
        <>
          <TituloDeSecao
            estilo="rotulo"
            acao={signals.length === 1 ? '1 novo' : `${signals.length} novos`}
          >
            Alertas da IA
          </TituloDeSecao>
          {signals.map((signal) => (
            <SignalCard
              key={`${signal.studentId}-${signal.kind}`}
              signal={signal}
              onPress={() => router.push(ROUTES.STUDENTS.DETAILS(signal.studentId))}
            />
          ))}
        </>
      ) : null}

      <TituloDeSecao estilo="rotulo">Atalhos</TituloDeSecao>
      <LinhaDeVidro
        icon="person-add-outline"
        tom="marca"
        titulo="Novo aluno"
        sub="Convite por e-mail"
        onPress={() => router.push(ROUTES.STUDENTS.CREATE)}
      />
      <LinhaDeVidro
        icon="trophy-outline"
        tom="gordura"
        titulo="Ranking de Elite"
        sub="Competição semanal"
        onPress={() => router.push(ROUTES.TABS.RANKING)}
      />
    </TelaDeVidroComFoto>
  );
}

/** "Sexta-feira, 12 de setembro", a sobrelinha do kit. */
function todayLabel(): string {
  const label = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return `${label[0].toUpperCase()}${label.slice(1)}`;
}

function SignalCard({ signal, onPress }: { signal: BriefingSignal; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      <Vidro classeExterna="mb-[0.5625rem]" className="flex-row items-center gap-3 p-[0.8125rem]">
        <CaixaDeIcone icon={SIGNAL_ICON[signal.kind]} tom={SIGNAL_TONE[signal.tone]} />
        <View className="min-w-0 flex-1">
          <Text className="text-[0.84375rem] font-bold tracking-tight text-foreground">
            {signal.studentName}
          </Text>
          <Text className="mt-0.5 text-[0.75rem] leading-[1.35] text-muted-foreground">
            {signal.message}
          </Text>
        </View>
      </Vidro>
    </TouchableOpacity>
  );
}
