import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { Bullet } from '@/components/ui/Bullet';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';

/**
 * Os exercícios que a Análise de Técnica conhece.
 *
 * Existe porque a tela de análise é de UM exercício, e sem esta lista o
 * agachamento seria a feature inteira sem nunca ter sido apresentado como uma
 * escolha entre várias.
 *
 * Os indisponíveis aparecem **desabilitados em vez de ausentes**, como no
 * painel de calibração do web: mostram para onde isto cresce sem fingir que já
 * cresceu. Cada um deles precisa do seu próprio Critério, do seu próprio limiar
 * calibrado e da sua própria vista de câmera — não é uma opção a mais num
 * seletor, é um ciclo de calibração inteiro (ver `ADR-0023`).
 *
 * No kit de vidro desde a #361, no idioma da introdução do body scan.
 */

interface Exercicio {
  id: string;
  nome: string;
  criterio: string;
  icone: keyof typeof Ionicons.glyphMap;
  /**
   * O destino, ou `undefined` para "em breve".
   *
   * Tipado pela entrada de `ROUTES`, e não como `string`: com `string` seria
   * preciso um cast no `router.push`, e `as never` é como rota inexistente
   * deixa de ser erro de compilação e vira botão que não faz nada.
   */
  rota?: typeof ROUTES.TECHNIQUE.SQUAT;
}

const EXERCICIOS: Exercicio[] = [
  {
    id: 'agachamento',
    nome: 'Agachamento',
    criterio: 'Conta as repetições e diz se o quadril passou da linha do joelho',
    icone: 'body-outline',
    rota: ROUTES.TECHNIQUE.SQUAT,
  },
  {
    id: 'flexao',
    nome: 'Flexão de braço',
    criterio: 'Precisa de um critério próprio e de outra vista de câmera',
    icone: 'fitness-outline',
  },
  {
    id: 'afundo',
    nome: 'Afundo',
    criterio: 'Precisa de um critério próprio e de outra vista de câmera',
    icone: 'walk-outline',
  },
];

function LinhaDoExercicio({ exercicio }: { exercicio: Exercicio }) {
  const router = useRouter();
  const { rota } = exercicio;

  if (!rota) {
    return (
      <View className="opacity-55">
        <LinhaDeVidro
          icon={exercicio.icone}
          tom="sono"
          titulo={exercicio.nome}
          sub={exercicio.criterio}
          direita={<Chip>Em breve</Chip>}
        />
      </View>
    );
  }

  return (
    <LinhaDeVidro
      icon={exercicio.icone}
      tom="marca"
      titulo={exercicio.nome}
      sub={exercicio.criterio}
      onPress={() => router.push(rota)}
    />
  );
}

export function ExerciciosDaTecnicaScreen() {
  const router = useRouter();

  return (
    <GlassScreen glow={HEALTH_GLOW}>
      <View className="pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <View className="mb-[1.125rem] mt-3.5 items-center">
        <Chip tom="destaque">No aparelho</Chip>
        <Text
          accessibilityRole="header"
          className="mt-3 text-center font-display-black text-[1.8125rem] leading-[2rem] tracking-tight text-hero"
        >
          Análise de <Text className="text-primary-text">técnica</Text>
        </Text>
        <Text className="mt-[0.5625rem] text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
          Escolha o exercício. O app conta suas repetições e avisa em voz alta a cada uma. Nada é
          gravado e nada sai do aparelho.
        </Text>
      </View>

      {EXERCICIOS.map((exercicio) => (
        <LinhaDoExercicio exercicio={exercicio} key={exercicio.id} />
      ))}

      <Vidro classeExterna="mt-1.5" className="p-[0.9375rem]">
        <Bullet>
          <Bullet.Strong>Filme de lado.</Bullet.Strong> Apoie o celular com um ombro apontando para
          a lente e o corpo inteiro no quadro. De frente a coxa some na projeção, e o app prefere
          calar a chutar.
        </Bullet>
      </Vidro>
    </GlassScreen>
  );
}
