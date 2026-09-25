import { progressoDaPeriodizacao } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Text, View } from 'react-native';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoObjetivo } from '@/shared/imagens/fotosDeTreino';
import type { Periodization } from '../store/workoutStore';

interface PeriodizationHeroCardProps {
  periodizacao: Periodization;
  /** Nome de quem a periodização não é de quem olha — some na visão do praticante. */
  nomeDoAluno?: string;
  onPress: () => void;
}

const TAMANHO_DO_ICONE = 12;

/**
 * A periodização ativa em destaque na lista — mesmo cartão da tela do aluno
 * (`CartaoDaPeriodizacaoAtiva`), com o nome do aluno no lugar do especialista
 * quando quem olha gerencia mais de um (#335).
 */
export function PeriodizationHeroCard({
  periodizacao,
  nomeDoAluno,
  onPress,
}: PeriodizationHeroCardProps) {
  const cores = useCores();
  const escalar = useEscala();
  const progresso = progressoDaPeriodizacao(
    periodizacao.start_date,
    periodizacao.end_date,
    new Date()
  );

  return (
    <Vidro destaque classeExterna="mb-3">
      <ImageBackground
        source={fotoDoObjetivo(periodizacao.objective)}
        resizeMode="cover"
        className="h-[8.25rem] justify-between p-3.5"
      >
        <LinearGradient
          colors={[cores.veuDaImagemTopo, cores.veuDaImagemBase]}
          className="absolute inset-0"
        />
        <View className="flex-row items-center gap-1.5">
          <Chip tom="destaque">Em andamento</Chip>
          {periodizacao.objective ? <Chip tom="sobreImagem">{periodizacao.objective}</Chip> : null}
        </View>
        <View>
          <Text
            numberOfLines={1}
            className="font-display-black text-[1.3125rem] tracking-tight text-sobre-imagem"
          >
            {periodizacao.name}
          </Text>
          {nomeDoAluno ? (
            <View className="mt-[0.1875rem] flex-row items-center gap-1.5">
              <Ionicons
                name="person-outline"
                size={escalar(TAMANHO_DO_ICONE)}
                color={cores.sobreImagemSecundario}
              />
              <Text numberOfLines={1} className="text-[0.71875rem] text-sobre-imagem-secundario">
                {nomeDoAluno}
              </Text>
            </View>
          ) : null}
        </View>
      </ImageBackground>

      <View className="px-[0.9375rem] pb-[0.9375rem] pt-3.5">
        <View className="mb-2 flex-row items-baseline justify-between">
          <Text className="text-[0.8125rem] font-bold text-foreground">
            Semana {progresso.semanaAtual} de {progresso.totalSemanas}
          </Text>
          <Text className="text-[0.78125rem] font-bold text-primary-text">
            {progresso.percentual}%
          </Text>
        </View>
        <BarraDeProgresso percentual={progresso.percentual} />
        {periodizacao.training_plans_count !== undefined ? (
          <View className="mt-[0.8125rem] overflow-hidden rounded-[0.875rem] bg-glass-strong">
            <View className="items-center px-1 py-[0.5625rem]">
              <Text className="font-display-black text-sm tracking-tight text-foreground">
                {periodizacao.training_plans_count}
              </Text>
              <Text className="mt-0.5 text-[0.53125rem] font-bold uppercase tracking-[0.12em] text-placeholder">
                Fases
              </Text>
            </View>
          </View>
        ) : null}
        <View className="mt-[0.8125rem]">
          <BotaoDeDestaque
            rotulo="Gerenciar"
            icone="arrow-forward"
            tamanho="cartao"
            onPress={onPress}
          />
        </View>
      </View>
    </Vidro>
  );
}
