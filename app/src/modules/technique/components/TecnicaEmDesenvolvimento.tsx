import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { HEALTH_GLOW } from '@/components/ui/BrilhoAmbiente';
import { CaixaDeIcone } from '@/components/ui/CaixaDeIcone';
import { Chip } from '@/components/ui/Chip';
import { GlassScreen } from '@/components/ui/GlassScreen';

/**
 * O que as rotas da Análise de Técnica mostram enquanto ela está bloqueada
 * (`TECHNIQUE_RELEASED`). Nem câmera nem pedido de autorização: só o aviso.
 *
 * @example TECHNIQUE_RELEASED ? <ExerciciosDaTecnicaScreen /> : <TecnicaEmDesenvolvimento />
 */
export function TecnicaEmDesenvolvimento() {
  const router = useRouter();

  return (
    <GlassScreen glow={HEALTH_GLOW}>
      <View className="pt-1.5">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={router.back} />
      </View>

      <View className="mt-16 items-center">
        <CaixaDeIcone icon="construct-outline" tom="marca" tamanho="bloco" />
        <View className="mt-5">
          <Chip tom="aviso">Em desenvolvimento</Chip>
        </View>
        <Text
          accessibilityRole="header"
          className="mt-3 text-center font-display-black text-[1.8125rem] leading-[2rem] tracking-tight text-hero"
        >
          Análise de <Text className="text-primary-text">técnica</Text>
        </Text>
        <Text className="mt-[0.5625rem] text-center text-[0.8125rem] leading-[1.22rem] text-hero-secondary">
          Estamos terminando de calibrar a análise para ela dizer só o que mede com segurança.
          Avisamos quando estiver liberada.
        </Text>
      </View>
    </GlassScreen>
  );
}
