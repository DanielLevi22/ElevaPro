import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { CaixaDeIcone, type TomDeMetrica } from '@/components/ui/CaixaDeIcone';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { Vidro } from '@/components/ui/Vidro';

/**
 * O que o aluno lê antes de a câmera abrir.
 *
 * Equivalente ao `BodyScanIntroduction`, e pela mesma razão: consentimento
 * informado (Art. 9°) é sobre o texto que a pessoa leu, não sobre o clique. O
 * botão vem depois do texto de propósito — por isso fica no fim da rolagem, e
 * não na barra fixa do rodapé que o body scan usa (#361).
 *
 * **Não promete precisão.** O critério é geométrico e o limiar ainda não saiu
 * de corpus rotulado — dizer "o app sabe se você agachou certo" seria prometer
 * o que não se mediu.
 */

interface PontoProps {
  icone: keyof typeof Ionicons.glyphMap;
  tom: TomDeMetrica;
  titulo: string;
  children: string;
}

function Ponto({ icone, tom, titulo, children }: PontoProps) {
  return (
    <View className="flex-row gap-3 py-2">
      <CaixaDeIcone icon={icone} tom={tom} />
      <View className="min-w-0 flex-1">
        <Text className="text-rotulo font-bold tracking-tight text-foreground">{titulo}</Text>
        <Text className="mt-0.5 text-[0.8125rem] leading-[1.22rem] text-muted-foreground">
          {children}
        </Text>
      </View>
    </View>
  );
}

interface IntroducaoProps {
  onAutorizar: () => void;
  onCancelar: () => void;
  erro: string | null;
}

export function IntroducaoDaTecnica({ onAutorizar, onCancelar, erro }: IntroducaoProps) {
  const router = useRouter();

  return (
    <GlassScreen glow={HEALTH_GLOW}>
      <View className="pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <View className="mb-[1.125rem] mt-3.5 items-center">
        <Chip tom="destaque">Sua autorização</Chip>
        <Text
          accessibilityRole="header"
          className="mt-3 text-center font-display-black text-[1.8125rem] leading-[2rem] tracking-tight text-hero"
        >
          Análise de <Text className="text-primary-text">técnica</Text>
        </Text>
        <Text className="mt-[0.5625rem] text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
          O app conta suas repetições de agachamento e diz se cada uma passou da paralela. Antes
          disso, você precisa saber o que acontece.
        </Text>
      </View>

      <Vidro className="px-[0.9375rem] py-2">
        <Ponto tom="ritmo" icone="videocam-outline" titulo="A câmera fica aberta">
          Ela não tira fotos: analisa continuamente enquanto a tela está aberta, para conseguir
          contar e falar no meio do movimento.
        </Ponto>
        <Ponto tom="passos" icone="eye-off-outline" titulo="Nada é gravado">
          Nenhuma imagem é salva, nem aqui nem em servidor. O que se extrai de cada quadro é a
          posição das suas articulações — um boneco de palito, sem imagem e sem rosto.
        </Ponto>
        <Ponto tom="passos" icone="phone-portrait-outline" titulo="Nada sai do aparelho">
          A análise inteira roda aqui dentro. Nem a imagem nem as posições são enviadas para lugar
          nenhum, e seu personal não recebe nada disso.
        </Ponto>
        <Ponto tom="gordura" icone="volume-high-outline" titulo="O app fala alto">
          Ele diz "fundo" ou "faltou" a cada repetição. Numa academia, quem estiver por perto vai
          ouvir.
        </Ponto>
        <Ponto tom="cadencia" icone="body-outline" titulo="Não substitui seu personal">
          O app olha uma coisa só: se o quadril passou da linha do joelho. Não avalia joelho,
          coluna, ritmo, nem se o exercício é adequado para você.
        </Ponto>
        <Ponto tom="marca" icone="arrow-undo-outline" titulo="Você pode voltar atrás">
          Retire esta autorização quando quiser, no seu perfil, em Minhas Autorizações. A análise
          para na hora.
        </Ponto>
      </Vidro>

      {erro !== null && (
        <View className="mt-3 rounded-[1.375rem] border border-metrica-batimento/40 bg-metrica-batimento/10 p-4">
          <Text className="text-[0.8125rem] leading-[1.22rem] text-texto-cardio-batimento">
            {erro}
          </Text>
        </View>
      )}

      <View className="mt-6">
        <BotaoDeDestaque rotulo="Li e autorizo" icone="checkmark" onPress={onAutorizar} />
        <TouchableOpacity className="mt-1 py-4" onPress={onCancelar} accessibilityRole="button">
          <Text className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Agora não
          </Text>
        </TouchableOpacity>
      </View>
    </GlassScreen>
  );
}
