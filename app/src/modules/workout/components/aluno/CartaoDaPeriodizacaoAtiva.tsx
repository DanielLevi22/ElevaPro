import { progressoDaPeriodizacao, type ResumoDaPeriodizacao } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Text, View } from 'react-native';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Chip } from '@/components/ui/Chip';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoObjetivo } from '@/shared/imagens/fotosDeTreino';

/**
 * A periodização em andamento no topo da lista de periodizações: foto do objetivo,
 * semana, fases e treinos, e o botão que volta à periodização.
 *
 * O kit tem mais duas células na faixa, "Restantes" e "Aderência". Não
 * entraram: o app não tem regra de quantos treinos a periodização espera por semana,
 * e sem ela os dois números seriam inventados (a regra do treino do dia é a
 * #291).
 *
 * @example
 * <CartaoDaPeriodizacaoAtiva resumo={ativo} especialista="Daniel L." onContinuar={abrir} />
 */
interface CartaoDaPeriodizacaoAtivaProps {
  resumo: ResumoDaPeriodizacao;
  especialista: string | null;
  onContinuar: () => void;
}

const TAMANHO_DO_ICONE = 12;

export function CartaoDaPeriodizacaoAtiva({
  resumo,
  especialista,
  onContinuar,
}: CartaoDaPeriodizacaoAtivaProps) {
  const cores = useCores();
  const escalar = useEscala();
  const { periodizacao, faseAtual } = resumo;
  const progresso = progressoDaPeriodizacao(
    periodizacao.start_date,
    periodizacao.end_date,
    new Date()
  );
  const legenda = [especialista, faseAtual ? `Fase ${faseAtual.numero} · ${faseAtual.nome}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Vidro destaque classeExterna="mt-[1.125rem]">
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
          {legenda ? (
            <View className="mt-[0.1875rem] flex-row items-center gap-1.5">
              <Ionicons
                name="person-outline"
                size={escalar(TAMANHO_DO_ICONE)}
                color={cores.sobreImagemSecundario}
              />
              <Text numberOfLines={1} className="text-[0.71875rem] text-sobre-imagem-secundario">
                {legenda}
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
        <View className="mt-[0.8125rem] flex-row overflow-hidden rounded-[0.875rem] bg-glass-strong">
          <CelulaDaPeriodizacao valor={String(resumo.fases)} rotulo="Fases" />
          <CelulaDaPeriodizacao valor={String(resumo.treinos)} rotulo="Treinos" />
        </View>
        <View className="mt-[0.8125rem]">
          <BotaoDeDestaque
            rotulo="Continuar ciclo"
            icone="arrow-forward"
            tamanho="cartao"
            onPress={onContinuar}
          />
        </View>
      </View>
    </Vidro>
  );
}

function CelulaDaPeriodizacao({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View className="flex-1 items-center px-1 py-[0.5625rem]">
      <Text className="font-display-black text-sm tracking-tight text-foreground">{valor}</Text>
      <Text className="mt-0.5 text-[0.53125rem] font-bold uppercase tracking-[0.12em] text-placeholder">
        {rotulo}
      </Text>
    </View>
  );
}
