import { doisDigitos } from '@elevapro/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { showAlert, showConfirm } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { Pedestal } from '@/components/ui/Pedestal';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { WatchHero } from '@/components/ui/WatchHero';
import { useHealthData } from '@/hooks/useHealthData';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { disconnectPlatform } from '@/shared/wearable';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useHealthHistory } from '../hooks/useHealthHistory';
import { platformLabel } from '../services/healthChecklist';

export interface MyWatchScreenProps {
  studentId: string;
}

/**
 * Tela 4 do kit: Meu relógio. A fonte dos dados, se está conectada, a última leitura
 * de cada métrica e as entradas para permissões e diagnóstico.
 *
 * O kit mostra bateria, uso e outros dispositivos; nada disso vem pelo Health
 * Connect ou pelo HealthKit, e a tela não inventa (#308). No lugar do modelo do
 * relógio vai a fonte: o Health Connect não diz o modelo de forma confiável.
 *
 * @example <MyWatchScreen studentId={user.id} />
 */
export function MyWatchScreen({ studentId }: MyWatchScreenProps) {
  const router = useRouter();
  const health = useHealthData();
  const history = useHealthHistory(studentId);
  const { result, watch, recheck } = useHealthCheck(studentId);
  const disconnect = useDisconnect(recheck);
  const [syncing, setSyncing] = useState(false);
  const syncedAt = history.days.find((day) => day.date === localDateKey())?.synced_at ?? null;

  const syncNow = async () => {
    setSyncing(true);
    try {
      await health.refetch();
      await Promise.all([history.reload(), recheck()]);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Desconectar', icone: 'unlink', onPress: disconnect }}
          principal={{
            rotulo: syncing ? 'Sincronizando' : 'Sincronizar agora',
            icone: 'refresh',
            desabilitada: syncing,
            onPress: syncNow,
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={router.back} />
        <Text className="flex-1 text-[1.3125rem] font-bold tracking-tight text-hero">
          Meu relógio
        </Text>
      </View>

      <Vidro destaque classeExterna="mt-4" className="items-center p-5">
        <Pedestal size={210} lift={8}>
          <WatchHero scale={0.84} />
        </Pedestal>
        <Text className="mt-3.5 font-display-black text-[1.3125rem] tracking-tight text-foreground">
          {platformLabel(watch.platform)}
        </Text>
        <View className="mt-[0.5625rem] flex-row flex-wrap justify-center gap-[0.4375rem]">
          <ConnectionChip
            connected={watch.capabilities.dailyActivity === 'available'}
            available={watch.available}
          />
          {syncedAt ? <Chip>{`Sincronizado ${timeOf(syncedAt)}`}</Chip> : null}
        </View>
      </Vidro>

      <TituloDeSecao estilo="rotulo">Última sincronização</TituloDeSecao>
      <LastReadings health={health} syncedAt={syncedAt} />

      <TituloDeSecao estilo="rotulo">Relógio</TituloDeSecao>
      <LinhaDeVidro
        icon="options-outline"
        tom="marca"
        titulo="O que você autoriza"
        sub="O que chega de cada tipo de dado"
        onPress={() => router.push(ROUTES.HEALTH.PERMISSIONS)}
      />
      <LinhaDeVidro
        icon="pulse-outline"
        tom="marca"
        titulo="Diagnóstico"
        sub={result ? `${result.okCount} de ${result.total} tudo certo` : 'Conferindo…'}
        onPress={() => router.push(ROUTES.HEALTH.CHECK)}
      />
    </GlassScreen>
  );
}

function timeOf(iso: string): string {
  const date = new Date(iso);
  return `${doisDigitos(date.getHours())}:${doisDigitos(date.getMinutes())}`;
}

function ConnectionChip({
  connected,
  available,
}: {
  connected: boolean;
  available: boolean | null;
}) {
  if (available === false) return <Chip tom="aviso">Não instalado</Chip>;
  if (connected)
    return (
      <Chip tom="evolucao" icone="ellipse">
        Conectado
      </Chip>
    );
  return <Chip tom="aviso">Sem leitura</Chip>;
}

function LastReadings({
  health,
  syncedAt,
}: {
  health: ReturnType<typeof useHealthData>;
  syncedAt: string | null;
}) {
  const when = syncedAt ? `hoje, ${timeOf(syncedAt)}` : 'lido agora no aparelho';
  const rows = [
    {
      icon: 'footsteps',
      tom: 'passos',
      label: 'Passos',
      value: health.steps.toLocaleString('pt-BR'),
    },
    { icon: 'flame', tom: 'calorias', label: 'Calorias ativas', value: `${health.calories} kcal` },
    {
      icon: 'moon',
      tom: 'sono',
      label: 'Sono',
      value:
        health.sleepMinutes === null
          ? '—'
          : `${Math.floor(health.sleepMinutes / 60)} h ${doisDigitos(health.sleepMinutes % 60)}`,
    },
    {
      icon: 'heart',
      tom: 'batimento',
      label: 'FC de repouso',
      value: health.restingHeartRate === null ? '—' : `${health.restingHeartRate} bpm`,
    },
  ] as const;

  if (health.source === 'unavailable') {
    return (
      <Vidro className="p-4">
        <Text className="text-center text-legenda text-muted-foreground">
          Sem acesso ao relógio agora. Confira as permissões em "O que você autoriza".
        </Text>
      </Vidro>
    );
  }
  return (
    <>
      {rows.map((row) => (
        <LinhaDeVidro
          key={row.label}
          icon={row.icon}
          tom={row.tom}
          titulo={row.label}
          sub={row.value === '—' ? 'sem leitura hoje' : when}
          direita={
            <Text className="font-display-black text-[0.9375rem] tracking-tight text-foreground">
              {row.value}
            </Text>
          }
        />
      ))}
    </>
  );
}

/**
 * Desconectar pergunta antes, e diz o que acontece: no Android as permissões são
 * revogadas; no iPhone o app não consegue revogar e abre o app Saúde.
 */
function useDisconnect(recheck: () => Promise<void>): () => void {
  const queryClient = useQueryClient();
  return () =>
    showConfirm({
      title: 'Desconectar o relógio?',
      message:
        'O app para de ler passos, sono e FC do relógio. O que já foi registrado continua no seu histórico.',
      type: 'warning',
      confirmText: 'Desconectar',
      cancelText: 'Manter',
      onConfirm: async () => {
        const outcome = await disconnectPlatform();
        await queryClient.invalidateQueries({ queryKey: ['watchStatus'] });
        await recheck();
        if (outcome === 'opened_settings') {
          showAlert({
            type: 'info',
            title: 'Termine no app Saúde',
            message:
              'No iPhone, quem retira o acesso é o app Saúde: em Compartilhamento, toque em Eleva Pro e desligue as categorias.',
          });
        }
      },
    });
}
