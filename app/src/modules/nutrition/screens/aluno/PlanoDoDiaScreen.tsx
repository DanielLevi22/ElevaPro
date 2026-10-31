import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { ROUTES } from '@/navigation/types';
import { useCores } from '@/shared/design';
import { TresMacros } from '../../components/aluno/AnelDeMacro';
import { BotaoDoAssistente } from '../../components/aluno/BotaoDoAssistente';
import { FaixaDaSemana } from '../../components/aluno/FaixaDaSemana';
import { LinhaDaRefeicao } from '../../components/aluno/LinhaDaRefeicao';
import { SelfGuidedPlanActions } from '../../components/recipes/SelfGuidedPlanActions';
import { type PlanoDoDia, usePlanoDoDia } from '../../hooks/usePlanoDoDia';

/**
 * A aba Nutrição do aluno — tela 1 do fluxo de nutrição do kit: a semana, o
 * anel de calorias do dia, os três macros e as refeições.
 *
 * O "Editar" do título das refeições virou "Lista de compras": o aluno não
 * edita o plano que o especialista prescreveu — o que ele muda é o que comeu,
 * pela troca no detalhe da refeição — e a lista precisava de uma porta.
 *
 * @example
 * <PlanoDoDiaScreen alunoId={user.id} />
 */
interface PlanoDoDiaScreenProps {
  alunoId: string;
  /**
   * O Praticante, sem especialista: o estado vazio fala com ele, e não do
   * especialista, e leva a montar o plano pelo onboarding.
   */
  selfGuided?: boolean;
}

export function PlanoDoDiaScreen({ alunoId, selfGuided = false }: PlanoDoDiaScreenProps) {
  const router = useRouter();
  const plano = usePlanoDoDia(alunoId);

  return (
    <GlassScreen
      refresh={{ refreshing: plano.puxando, onRefresh: plano.puxarParaAtualizar }}
      overlay={<BotaoDoAssistente onPress={() => router.push(ROUTES.NUTRITION.ASSISTANT)} />}
    >
      <View className="flex-row items-center justify-between pt-1.5">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[0.78125rem] font-semibold text-hero-secondary">
            Plano: {plano.nomeDoPlano ?? 'plano alimentar'}
          </Text>
          <Text className="mt-0.5 text-[1.6875rem] font-bold tracking-tight text-hero">
            Nutrição
          </Text>
        </View>
        <View className="flex-row gap-[0.5625rem]">
          <BotaoRedondo
            icone="calendar"
            rotulo="Aderência da semana"
            onPress={() => router.push(ROUTES.NUTRITION.ADHERENCE)}
          />
          <BotaoRedondo
            icone="plus"
            rotulo="Buscar alimento"
            onPress={() => router.push(ROUTES.NUTRITION.SEARCH)}
          />
        </View>
      </View>
      {selfGuided ? <SelfGuidedPlanActions /> : null}
      <PlanContent plan={plano} selfGuided={selfGuided} />
    </GlassScreen>
  );
}

function PlanContent({ plan, selfGuided }: { plan: PlanoDoDia; selfGuided: boolean }) {
  const colors = useCores();
  const router = useRouter();
  if (!plan.temPlano) {
    if (plan.carregando) return <ActivityIndicator className="mt-16" color={colors.primary} />;
    if (!selfGuided) {
      return (
        <Text className="px-6 py-16 text-center text-legenda text-muted-foreground">
          Seu especialista ainda não montou um plano alimentar para você.
        </Text>
      );
    }
    return (
      <View className="items-center gap-4 px-6 py-16">
        <Text className="text-center text-legenda text-muted-foreground">
          Você ainda não tem um plano alimentar ativo.
        </Text>
        <BotaoDeDestaque
          rotulo="Montar meu plano"
          tamanho="compacto"
          onPress={() => router.push(ROUTES.ONBOARDING.SCOPE)}
        />
      </View>
    );
  }

  return (
    <>
      <FaixaDaSemana hoje={plan.hoje} escolhida={plan.data} onEscolher={plan.escolherData} />
      <AnelDoDia consumidas={plan.consumo.calorias} meta={plan.meta.calorias} />
      <TresMacros valores={plan.consumo} metas={plan.meta} />
      <RefeicoesDoDia plano={plan} />
    </>
  );
}

/** O `Ring` grande do kit: 162 de lado, traço de 13, na cor da proteína. */
function AnelDoDia({ consumidas, meta }: { consumidas: number; meta: number }) {
  const cores = useCores();
  const valor = Math.round(consumidas);
  const deMeta = `de ${Math.round(meta)} kcal`;

  return (
    <View className="mb-1.5 mt-5 items-center">
      <Anel
        valor={consumidas}
        meta={meta}
        rotulo={String(valor)}
        sub={deMeta}
        tamanho={162}
        espessura={13}
        brilho={12}
        cor={cores.metricaProteina}
      >
        <Text className="font-display-black text-[2.375rem] leading-[2.375rem] tracking-tight text-hero">
          {valor}
        </Text>
        <Text className="mt-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-hero-secondary">
          {deMeta}
        </Text>
      </Anel>
    </View>
  );
}

function RefeicoesDoDia({ plano }: { plano: PlanoDoDia }) {
  const router = useRouter();

  return (
    <>
      {/* No kit a ação é "Editar"; o aluno não edita a prescrição. O lugar vira a
          porta da lista de compras, que a tela antiga abria pelo cabeçalho. */}
      <TituloDeSecao
        estilo="rotulo"
        acao="Lista de compras"
        onAcao={() => router.push(ROUTES.NUTRITION.SHOPPING)}
      >
        {plano.data === plano.hoje ? 'Refeições de hoje' : 'Refeições do dia'}
      </TituloDeSecao>
      {plano.refeicoes.map(({ refeicao, resumo, calorias, feita }) => (
        <LinhaDaRefeicao
          key={refeicao.id}
          nome={refeicao.name}
          // O banco guarda `HH:MM:SS` em parte dos planos; o kit mostra `HH:MM`.
          horario={refeicao.meal_time?.slice(0, 5) ?? null}
          resumo={resumo}
          calorias={calorias}
          feita={feita}
          onAbrir={() => router.push(ROUTES.NUTRITION.MEAL(refeicao.id, plano.data))}
          onMarcar={() => plano.marcar(refeicao.id)}
        />
      ))}
      {plano.refeicoes.length === 0 ? (
        <Text className="py-6 text-center text-micro text-muted-foreground">
          Nenhuma refeição planejada para este dia.
        </Text>
      ) : null}
    </>
  );
}
