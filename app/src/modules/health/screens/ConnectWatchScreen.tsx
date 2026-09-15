import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Bullet } from '@/components/ui/Bullet';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Pedestal } from '@/components/ui/Pedestal';
import { Vidro } from '@/components/ui/Vidro';
import { WatchHero } from '@/components/ui/WatchHero';
import { registrarFalha } from '@/lib/registro';
import { useCores, useEscala } from '@/shared/design';
import {
  isPlatformAvailable,
  platformName,
  refreshCapabilities,
  requestBackgroundRead,
  requestReadPermissions,
} from '@/shared/wearable';
import { platformLabel } from '../services/healthChecklist';

export interface ConnectWatchScreenProps {
  /** O Aluno lê que o especialista vê os dados; o Praticante, que não há quem veja. */
  hasSpecialist: boolean;
  /** Conectou, pulou ou falhou: o onboarding segue. */
  onDone: () => void;
}

/**
 * Tela 2 do kit: conectar o relógio, no fim do onboarding. O que é lido, o que o GPS
 * faz e quem vê, e as duas saídas — pular ou conectar.
 *
 * O texto do cartão é o que a `POLICY_VERSION` versiona: mudar o que ele diz sem
 * subir a versão aceita sob um texto que a pessoa não leu, e subir a versão sem
 * mudar o texto pede reconsentimento à toa — é assim que se ensina a aceitar sem ler.
 *
 * @example <ConnectWatchScreen hasSpecialist onDone={() => router.replace('/(tabs)')} />
 */
export function ConnectWatchScreen({ hasSpecialist, onDone }: ConnectWatchScreenProps) {
  const label = platformLabel(platformName());
  const connect = connectAction(label, onDone);

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{ rotulo: 'Pular', icone: 'play-skip-forward', onPress: onDone }}
          principal={{ rotulo: 'Conectar relógio', icone: 'link', onPress: connect }}
        />
      }
    >
      <View className="flex-row items-center gap-3 pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Pular" onPress={onDone} />
        <Text className="flex-1 text-center text-[0.90625rem] font-bold text-hero">
          Você está quase lá
        </Text>
        <View className="w-[2.375rem]" />
      </View>
      <View className="mt-3.5 h-1 overflow-hidden rounded-full bg-glass-strong">
        <View className="h-full w-[90%] rounded-full bg-primary" />
      </View>

      <Pedestal size={246} lift={10}>
        <WatchHero scale={0.94} />
      </Pedestal>
      <Exchange />

      <Text className="mt-[1.375rem] text-center font-display-black text-[1.5625rem] tracking-tight text-hero">
        {`Sincronizar com\n${label}`}
      </Text>

      <Vidro classeExterna="mt-[1.125rem]" className="p-[0.9375rem]">
        <Bullet>
          <Bullet.Strong>Lemos do seu relógio</Bullet.Strong> passos, calorias, quanto você dormiu,
          sua frequência cardíaca de repouso e a frequência cardíaca das suas corridas, para
          acompanhar sua atividade entre os treinos. Do sono e da FC de repouso calculamos a
          prontidão do dia, comparando com a sua própria média. Da corrida guardamos só a média e o
          tempo em cada zona de esforço, calculadas com a idade da sua anamnese; os batimentos um a
          um são lidos no seu aparelho e descartados.
        </Bullet>
        {/* A ausência também precisa ser dita: o GPS mede no aparelho e as
            coordenadas morrem com a sessão. Sem esta frase a pessoa assume o
            contrário — todo app de corrida que ela conhece guarda o mapa — e
            consentimento assumido errado não é informado (Art. 9°). */}
        <Bullet>
          Durante a corrida o GPS mede <Bullet.Strong>distância e ritmo</Bullet.Strong>. O caminho
          que você percorreu é desenhado na tela e{' '}
          <Bullet.Strong>descartado ao fim do treino</Bullet.Strong> — ele não é salvo nem enviado
          para ninguém.
        </Bullet>
        <WhoSees hasSpecialist={hasSpecialist} />
      </Vidro>
    </GlassScreen>
  );
}

const EXCHANGE_ICON = 20;

/** O app e o relógio lado a lado, com a troca entre os dois. */
function Exchange() {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="mt-0.5 flex-row items-center justify-center gap-[0.6875rem]">
      <Vidro
        classeExterna="rounded-[0.875rem]"
        className="h-11 w-11 items-center justify-center rounded-[0.875rem] border-primary"
      >
        <Ionicons name="barbell-outline" size={escalar(EXCHANGE_ICON)} color={cores.primaryText} />
      </Vidro>
      <Ionicons name="swap-horizontal" size={escalar(17)} color={cores.placeholder} />
      <Vidro
        classeExterna="rounded-[0.875rem]"
        className="h-11 w-11 items-center justify-center rounded-[0.875rem]"
      >
        <Ionicons name="pulse" size={escalar(EXCHANGE_ICON)} color={cores.textoBatimento} />
      </Vidro>
    </View>
  );
}

const LOCK_ICON = 14;

/**
 * Quem vê. O Praticante não tem especialista, e "seu personal vinculado vê" seria
 * descrever um tratamento que não acontece (#308).
 */
function WhoSees({ hasSpecialist }: { hasSpecialist: boolean }) {
  const cores = useCores();
  const escalar = useEscala();
  const who = hasSpecialist
    ? 'Seu personal vinculado vê esses dados.'
    : 'Hoje, só você vê esses dados; se você se vincular a um especialista, ele passa a ver.';
  return (
    <View className="mt-3 flex-row items-start gap-2.5 border-t border-glass-border pt-3">
      <Ionicons name="lock-closed-outline" size={escalar(LOCK_ICON)} color={cores.placeholder} />
      <Text className="flex-1 text-[0.71875rem] leading-[1.08rem] text-muted-foreground">
        {`${who} Você pode desligar quando quiser em Minhas Autorizações: a coleta para na hora${hasSpecialist ? ' e ele perde o acesso' : ''} — o histórico continua visível só para você.`}
      </Text>
    </View>
  );
}

/**
 * Conectar: plataforma disponível → permissão de leitura → segundo plano → aceite.
 *
 * O aceite só é gravado com a permissão concedida: antes o retorno era descartado,
 * e ficava "consentimento concedido, permissão negada".
 */
function connectAction(label: string, onDone: () => void): () => Promise<void> {
  return async () => {
    try {
      if (!(await isPlatformAvailable())) {
        // Sair calado fazia o toque não produzir nada visível — indistinguível de o
        // app ter travado.
        showAlert({
          title: `${label} indisponível`,
          message: `Não consegui falar com o ${label}. Verifique se ele está instalado e atualizado.`,
          type: 'info',
        });
        return;
      }
      if (!(await requestReadPermissions())) {
        // Fica na tela: "Conectar relógio" é a ação que resolve.
        showAlert({
          title: 'Permissão não concedida',
          message: `Sem acesso ao ${label} não dá para ler seus passos. Toque em Conectar relógio para tentar de novo.`,
          type: 'warning',
        });
        return;
      }
      await requestBackgroundRead();
      await recordCollectionConsent();
      // Antes do aceite toda capacidade era desconhecida; sem refazer agora, esse
      // relatório valeria pela janela inteira de validade.
      void refreshCapabilities();
      onDone();
    } catch {
      registrarFalha('wearable.request_permissions');
      onDone();
    }
  };
}

/**
 * A permissão do sistema autoriza a leitura; o aceite da LGPD autoriza guardar. Sem
 * este registro `hasCollectionConsent` segue falso e nada é persistido.
 */
async function recordCollectionConsent(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    await createHealthService(supabase).grantCollectionConsent(session.user.id);
  } catch {
    // Sem o erro no log: o do PostgREST pode carregar o payload do consentimento.
    registrarFalha('wearable.record_consent');
  }
}
