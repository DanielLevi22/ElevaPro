import { contagem, formatarDecimal, type JourneyEvent } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BlocoDeMetrica } from '@/components/ui/BlocoDeMetrica';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { PROGRESS_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { ProgressHeader } from '@/components/ui/ProgressHeader';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { EmptyCard } from '../components/ChartCard';
import { shortDate } from '../components/measurementLabels';
import { useJourney } from '../hooks/useJourney';

const ICONS: Record<JourneyEvent['kind'], keyof typeof Ionicons.glyphMap> = {
  start: 'sparkles-outline',
  block: 'flag-outline',
  record: 'trophy-outline',
  target: 'locate-outline',
  swap: 'swap-horizontal',
  rest: 'pause-outline',
};
const ICON_SIZE = 15;

const signedKg = (value: number) =>
  value === 0 ? '0' : `${value > 0 ? '+' : '−'}${formatarDecimal(Math.abs(value))}`;

/**
 * D1 · Sua jornada: os números do caminho todo e a linha do tempo do "Seu
 * plano nasceu" até hoje, com quantas vezes o plano mudou com a pessoa.
 *
 * @example <JourneyScreen studentId={user.id} />
 */
export function JourneyScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { data: journey, isLoading } = useJourney(studentId);

  return (
    <GlassScreen glow={PROGRESS_GLOW} bottomSpace="tab">
      <ProgressHeader
        size="page"
        eyebrow={
          journey?.since
            ? `Desde ${shortDate(journey.since)} · ${contagem(journey.weeks, 'semana', 'semanas')}`
            : 'Progresso'
        }
        title="Sua jornada"
        leading={<BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />}
      />
      {journey?.since ? (
        <>
          <View className="mt-3 flex-row gap-2">
            <BlocoDeMetrica
              icon="scale-outline"
              tom="passos"
              valor={journey.weightChange === null ? '—' : signedKg(journey.weightChange)}
              unidade={journey.weightChange === null ? undefined : 'kg'}
              legenda="peso"
            />
            <BlocoDeMetrica
              icon="trophy-outline"
              tom="marca"
              valor={String(journey.records)}
              legenda="recordes"
            />
            <BlocoDeMetrica
              icon="flame"
              tom="calorias"
              valor={String(journey.streakWeeks)}
              legenda="semanas seguidas"
            />
          </View>
          <TituloDeSecao estilo="rotulo">Linha do tempo</TituloDeSecao>
          <Vidro className="p-3.5">
            {journey.events.map((event, index) => (
              <Milestone
                // biome-ignore lint/suspicious/noArrayIndexKey: a lista não reordena, e duas trocas no mesmo dia têm data e título iguais
                key={`${index}-${event.kind}-${event.date}`}
                event={event}
                first={index === 0}
                last={index === journey.events.length - 1}
              />
            ))}
          </Vidro>
          <View className="mt-3">
            <LinhaDeVidro
              icon="sparkles-outline"
              tom="marca"
              titulo={
                journey.changes === 0
                  ? 'Seu plano seguiu como estava'
                  : journey.changes === 1
                    ? 'Seu plano mudou 1 vez com você'
                    : `Seu plano mudou ${journey.changes} vezes com você`
              }
              sub="Cargas, meta e exercícios, sempre com o porquê"
              direita={<View />}
            />
          </View>
        </>
      ) : isLoading ? null : (
        <EmptyCard>A jornada começa no dia em que você aprova seu primeiro plano.</EmptyCard>
      )}
    </GlassScreen>
  );
}

/** Um marco da linha do tempo: o ícone na trilha, a data, o que foi. */
function Milestone({ event, first, last }: { event: JourneyEvent; first: boolean; last: boolean }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="flex-row gap-3">
      <View className="w-8 items-center">
        <View
          className={cn(
            'h-8 w-8 items-center justify-center rounded-full',
            first ? 'bg-primary' : 'bg-primary/15'
          )}
        >
          <Ionicons
            name={ICONS[event.kind]}
            size={escalar(ICON_SIZE)}
            color={first ? cores.primaryForeground : cores.primary}
          />
        </View>
        {last ? null : <View className="my-1 w-0.5 flex-1 bg-glass-border" />}
      </View>
      <View className={cn('flex-1', last ? null : 'pb-3.5')}>
        <Text className="font-mono text-[0.5625rem] font-bold uppercase tracking-widest text-placeholder">
          {shortDate(event.date)}
        </Text>
        <Text className="mt-0.5 text-[0.84375rem] font-bold text-foreground">{event.title}</Text>
        {event.sub ? (
          <Text className="mt-0.5 text-[0.71875rem] text-muted-foreground">{event.sub}</Text>
        ) : null}
      </View>
    </View>
  );
}
