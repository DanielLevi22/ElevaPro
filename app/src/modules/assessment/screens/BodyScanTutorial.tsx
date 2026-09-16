import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { InfoNote } from '@/components/ui/InfoNote';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';

/**
 * Tela 2 do kit de body scan: o que preparar antes da câmera abrir.
 *
 * Ensina **só o que o aluno controla**. Enquadramento, distância e nível não
 * estão aqui: o portão corrige os três sozinho, e pedir que ele decore o que a
 * máquina já resolve é passar trabalho para o lado errado (`ADR-0022`).
 *
 * @example <BodyScanTutorial />
 */
interface PrepItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  why: string;
}

const PREP: PrepItem[] = [
  {
    icon: 'shirt-outline',
    title: 'Roupa justa',
    why: 'A silhueta é o que dá as medidas, e ela enxerga o tecido, não você. Moletom devolve uma cintura que não é a sua.',
  },
  {
    icon: 'footsteps-outline',
    title: 'Descalço',
    why: 'O solado entra na altura e desloca a escala da foto inteira.',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Celular apoiado e em pé',
    why: 'Encostado numa parede ou móvel, na altura da cintura. Na mão de outra pessoa ele oscila.',
  },
  {
    icon: 'sunny-outline',
    title: 'Luz na sua frente',
    why: 'Janela ou lâmpada atrás de você apaga o contorno do corpo.',
  },
  {
    icon: 'people-outline',
    title: 'Ninguém atrás de você',
    why: 'A análise mede uma pessoa por vez, e quem passar no fundo pode roubar a medida.',
  },
];

const ICON_SIZE = 17;

export default function BodyScanTutorial() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const ready = () => router.replace({ pathname: ROUTES.ASSESSMENT.GRID, params: { studentId } });

  return (
    <GlassScreen
      glow={HEALTH_GLOW}
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          semAbas
          secundaria={{ rotulo: 'Voltar', icone: 'chevron-back', onPress: router.back }}
          principal={{ rotulo: 'Estou pronto', icone: 'checkmark', onPress: ready }}
        />
      }
    >
      <View className="pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <View className="mt-[1.125rem]">
        <Text className="text-[0.65625rem] font-extrabold uppercase tracking-[0.2em] text-primary-text">
          Antes de começar
        </Text>
        <Text
          accessibilityRole="header"
          className="mt-2 font-display-black text-[1.625rem] leading-[1.875rem] tracking-tight text-hero"
        >
          Cinco coisas que só você pode ajustar
        </Text>
        <Text className="mt-[0.5625rem] text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
          Do resto o app cuida: ele vai te dizer, por voz, onde ficar e quando está certo.
        </Text>
      </View>

      <View className="mt-[1.125rem] gap-2.5">
        {PREP.map((item, index) => (
          <PrepRow key={item.title} item={item} number={index + 1} />
        ))}
      </View>

      {/* O disparo sozinho fica no texto: o kit o tirou, e sem ele o aluno
          procura um botão que não existe, a metros do celular. */}
      <InfoNote icon="volume-high-outline" className="mt-2.5">
        Enquadramento, distância e nível do celular o app corrige sozinho — por voz, durante a
        captura. Quando estiver certo, ele conta cinco segundos e fotografa.
      </InfoNote>
    </GlassScreen>
  );
}

function PrepRow({ item, number }: { item: PrepItem; number: number }) {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <Vidro className="flex-row gap-[0.8125rem] p-3.5">
      <View className="h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-[0.8125rem] bg-glass-strong">
        <Ionicons name={item.icon} size={escalar(ICON_SIZE)} color={cores.primaryText} />
        <View className="absolute -left-[0.3125rem] -top-[0.3125rem] h-[1.0625rem] w-[1.0625rem] items-center justify-center rounded-full bg-primary">
          <Text className="text-[0.59375rem] font-extrabold text-primary-foreground">{number}</Text>
        </View>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[0.90625rem] font-bold tracking-tight text-foreground">
          {item.title}
        </Text>
        <Text className="mt-[0.1875rem] text-[0.75rem] leading-[1.09rem] text-muted-foreground">
          {item.why}
        </Text>
      </View>
    </Vidro>
  );
}
