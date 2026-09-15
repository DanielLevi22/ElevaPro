import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import type { TomDeMetrica } from '@/components/ui/CaixaDeIcone';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { cn } from '@/lib/utils';
import {
  type Capability,
  type CapabilityStatus,
  openPlatformSettings,
  requestBackgroundRead,
} from '@/shared/wearable';
import { useWatchStatus } from '../hooks/useWatchStatus';
import { platformLabel } from '../services/healthChecklist';

/**
 * Tela 3 do kit: O que você autoriza. Um tipo de dado por linha, com o que de fato
 * chega do relógio, e o caminho para mudar no sistema.
 *
 * O kit desenha interruptores. Quem concede cada tipo é o Health Connect ou o
 * HealthKit, e o app não liga nem desliga sozinho: um interruptor aqui fingiria um
 * controle que não existe (#308). A linha mostra o estado real, pela detecção de
 * capacidades, e o botão abre a tela do sistema. Voltando de lá, confere de novo.
 *
 * @example <WatchPermissionsScreen />
 */
interface DataType {
  icon: keyof typeof Ionicons.glyphMap;
  tone: TomDeMetrica;
  name: string;
  description: string;
  capability: Capability;
}

const DATA_TYPES: readonly DataType[] = [
  {
    icon: 'footsteps',
    tone: 'passos',
    name: 'Passos',
    description: 'Total do dia',
    capability: 'dailyActivity',
  },
  {
    icon: 'flame',
    tone: 'calorias',
    name: 'Calorias ativas',
    description: 'Gasto estimado do dia',
    capability: 'dailyActivity',
  },
  {
    icon: 'moon',
    tone: 'sono',
    name: 'Sono',
    description: 'Minutos dormidos na noite',
    capability: 'sleepAndRestingHr',
  },
  {
    icon: 'heart',
    tone: 'batimento',
    name: 'FC de repouso',
    description: 'Uma leitura por dia',
    capability: 'sleepAndRestingHr',
  },
  {
    icon: 'pulse',
    tone: 'batimento',
    name: 'FC durante o treino',
    description: 'Média e zonas das corridas',
    capability: 'workoutHeartRate',
  },
];

const STATUS_LABEL: Record<CapabilityStatus, string> = {
  available: 'Chegando',
  unavailable: 'Não chega',
  unknown: 'Sem leitura',
};

export function WatchPermissionsScreen() {
  const router = useRouter();
  const watch = useWatchStatus();
  const label = platformLabel(watch.platform);
  const arriving = DATA_TYPES.filter(
    (type) => watch.capabilities[type.capability] === 'available'
  ).length;
  useRecheckOnReturn(watch.recheck);

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Voltar', icone: 'chevron-back', onPress: router.back }}
          principal={{
            rotulo: `Abrir ${label}`,
            icone: 'open-outline',
            onPress: openPlatformSettings,
          }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={router.back} />
        <View className="min-w-0 flex-1">
          <Text className="text-micro font-bold uppercase tracking-wide text-hero-secondary">
            {label}
          </Text>
          <Text className="mt-0.5 text-[1.3125rem] font-bold tracking-tight text-hero">
            O que você autoriza
          </Text>
        </View>
      </View>

      <InfoNote icon="toggle-outline" className="mt-4">
        {`Cada tipo é liberado separadamente no ${label}. Recusar o sono não impede a leitura dos passos.`}
      </InfoNote>

      <TituloDeSecao estilo="rotulo" acao={`${arriving} de ${DATA_TYPES.length} chegando`}>
        Tipos de dado
      </TituloDeSecao>
      {DATA_TYPES.map((type) => (
        <LinhaDeVidro
          key={type.name}
          icon={type.icon}
          tom={type.tone}
          titulo={type.name}
          sub={type.description}
          direita={<StatusLabel status={watch.capabilities[type.capability]} />}
        />
      ))}

      {watch.background === 'not_applicable' ? null : (
        <>
          <TituloDeSecao estilo="rotulo">Leitura em segundo plano</TituloDeSecao>
          <LinhaDeVidro
            icon="sync"
            tom="marca"
            titulo="Sincronizar sozinho"
            sub={
              watch.background === 'granted'
                ? 'Os dados chegam mesmo com o app fechado'
                : 'Sem ela, os dados só chegam quando você abre o app'
            }
            direita={
              <Text
                className={cn(
                  'text-[0.65625rem] font-extrabold uppercase tracking-wide',
                  watch.background === 'granted' ? 'text-texto-macro-proteina' : 'text-primary-text'
                )}
              >
                {watch.background === 'granted' ? 'Ativa' : 'Permitir'}
              </Text>
            }
            onPress={
              watch.background === 'granted'
                ? undefined
                : async () => {
                    await requestBackgroundRead();
                    await watch.recheck();
                  }
            }
          />
        </>
      )}
    </GlassScreen>
  );
}

function StatusLabel({ status }: { status: CapabilityStatus }) {
  return (
    <Text
      className={cn(
        'text-[0.65625rem] font-extrabold uppercase tracking-wide',
        status === 'available' && 'text-texto-macro-proteina',
        status === 'unavailable' && 'text-texto-macro-gordura',
        status === 'unknown' && 'text-placeholder'
      )}
    >
      {STATUS_LABEL[status]}
    </Text>
  );
}

/** Quem abriu o sistema e voltou mudou alguma coisa: confere na hora. */
function useRecheckOnReturn(recheck: () => Promise<void>): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recheck();
    });
    return () => subscription.remove();
  }, [recheck]);
}
