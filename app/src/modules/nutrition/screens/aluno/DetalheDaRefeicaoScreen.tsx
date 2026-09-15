import { type DietMeal, textoDaDificuldade, textoDasPorcoes } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { ROUTES } from '@/navigation/types';
import { useCores, useEscala } from '@/shared/design';
import { TresMacros } from '../../components/aluno/AnelDeMacro';
import { iconeDaRefeicao } from '../../components/aluno/IconeDaRefeicao';
import { LinhaDoAlimento } from '../../components/aluno/LinhaDoAlimento';
import { type RefeicaoAberta, useRefeicaoDoDia } from '../../hooks/useRefeicaoDoDia';
import {
  type ItemDoPrato,
  type Macros,
  macrosDosItens,
  percentualDaMeta,
} from '../../services/consumoDoDia';
import { useFavoritosStore } from '../../store/favoritosStore';

/**
 * Tela 2 do fluxo de nutrição do kit: o prato de uma refeição, com o total, os
 * macros sobre a meta do dia e os alimentos.
 *
 * "Substituir" e "Ajustar" abrem o mesmo modo: tocar num alimento leva à troca.
 * O kit desenha as duas portas e nenhuma edição de quantidade; o aluno não
 * reescreve a prescrição, troca o que comeu.
 *
 * O coração guarda o favorito só no aparelho (LGPD, #298). A linha de tempo,
 * dificuldade e porções mostra o que o especialista informou, e some o que ele
 * não informou; o modo de preparo, que a tela antiga abria pelo cartão, fecha a
 * linha.
 *
 * @example
 * <DetalheDaRefeicaoScreen alunoId={user.id} refeicaoId={id} data="2026-08-12" somenteLeitura={false} />
 */
interface DetalheDaRefeicaoScreenProps {
  alunoId: string;
  refeicaoId: string;
  data: string;
  somenteLeitura: boolean;
}

/** Proteína a partir de 30% das calorias do prato: o chip "Alta proteína" do kit. */
const FRACAO_DE_ALTA_PROTEINA = 0.3;
const KCAL_POR_GRAMA_DE_PROTEINA = 4;

export function DetalheDaRefeicaoScreen({
  alunoId,
  refeicaoId,
  data,
  somenteLeitura,
}: DetalheDaRefeicaoScreenProps) {
  const router = useRouter();
  const aberta = useRefeicaoDoDia(alunoId, refeicaoId, data, { somenteLeitura });
  const [trocando, setTrocando] = useState(false);

  if (!aberta.refeicao) return <SemRefeicao naoEncontrada={aberta.naoEncontrada} />;

  return (
    <GlassScreen
      flushTop
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{
            rotulo: trocando ? 'Pronto' : 'Ajustar',
            icone: trocando ? 'checkmark' : 'pencil',
            onPress: () => setTrocando((atual) => !atual),
          }}
          principal={{
            rotulo: aberta.feita ? 'Desmarcar' : 'Marcar como feita',
            icone: aberta.feita ? 'close' : 'checkmark',
            onPress: aberta.marcar,
          }}
        />
      }
    >
      <TopoDaRefeicao
        alunoId={alunoId}
        refeicaoId={refeicaoId}
        nome={aberta.refeicao.name}
        onVoltar={router.back}
      />
      <View className="-mt-7 rounded-t-[1.75rem] bg-background px-[1.125rem] pt-5">
        <CabecalhoDoPrato refeicao={aberta.refeicao} itens={aberta.itens} macros={aberta.macros} />
        <TotalDoPrato aberta={aberta} />
        <TresMacros valores={aberta.macros} metas={aberta.metaDiaria} />
        <AlimentosDoPrato
          itens={aberta.itens}
          trocando={trocando}
          onAlternar={() => setTrocando((atual) => !atual)}
          onTrocar={(item) => router.push(ROUTES.NUTRITION.SWAP(refeicaoId, item.id, data))}
        />
      </View>
    </GlassScreen>
  );
}

function SemRefeicao({ naoEncontrada }: { naoEncontrada: boolean }) {
  const cores = useCores();
  return (
    <GlassScreen>
      {naoEncontrada ? (
        <Text className="px-6 py-16 text-center text-legenda text-muted-foreground">
          Essa refeição não está no seu plano atual.
        </Text>
      ) : (
        <ActivityIndicator className="mt-16" color={cores.primary} />
      )}
    </GlassScreen>
  );
}

/**
 * O lugar da foto do prato, 250 no kit, abaixo dos 52 da barra de status. O
 * app não guarda foto de prato (LGPD, `0035`): o espaço leva o ícone da
 * refeição.
 */
interface TopoDaRefeicaoProps {
  alunoId: string;
  refeicaoId: string;
  nome: string;
  onVoltar: () => void;
}

function TopoDaRefeicao({ alunoId, refeicaoId, nome, onVoltar }: TopoDaRefeicaoProps) {
  const cores = useCores();
  const escalar = useEscala();
  const favorita = useFavoritosStore((s) => (s.porAluno[alunoId] ?? []).includes(refeicaoId));

  return (
    <View className="h-[18.875rem] items-center justify-center bg-glass-strong pt-[3.25rem]">
      <Ionicons name={iconeDaRefeicao(nome)} size={escalar(64)} color={cores.placeholder} />
      <View className="absolute left-[1.125rem] right-[1.125rem] top-[4.125rem] flex-row justify-between">
        <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onVoltar} />
        <BotaoRedondo
          icone="heart"
          preenchido={favorita}
          rotulo={favorita ? 'Tirar dos favoritos' : 'Favoritar refeição'}
          onPress={() => useFavoritosStore.getState().alternar(alunoId, refeicaoId)}
        />
      </View>
    </View>
  );
}

interface CabecalhoDoPratoProps {
  refeicao: DietMeal;
  itens: ItemDoPrato[];
  macros: Macros;
}

function CabecalhoDoPrato({ refeicao, itens, macros }: CabecalhoDoPratoProps) {
  const router = useRouter();
  const horario = refeicao.meal_time?.slice(0, 5);
  const altaProteina =
    macros.calorias > 0 &&
    (macros.proteina * KCAL_POR_GRAMA_DE_PROTEINA) / macros.calorias >= FRACAO_DE_ALTA_PROTEINA;
  const abrirPreparo = () =>
    router.push({
      pathname: ROUTES.NUTRITION.COOKING,
      params: {
        mealName: refeicao.name,
        mealId: refeicao.id,
        ingredients: JSON.stringify(itens.map((item) => item.food?.name ?? 'Item sem nome')),
      },
    });

  return (
    <>
      <View className="mb-2.5 flex-row gap-1.5">
        {altaProteina ? <Chip tom="destaque">Alta proteína</Chip> : null}
        <Chip>{horario ? `${refeicao.name} · ${horario}` : refeicao.name}</Chip>
      </View>
      <Text className="text-[1.5rem] font-bold tracking-tight text-foreground">
        {tituloDoPrato(itens) || refeicao.name}
      </Text>
      <View className="mt-[0.4375rem] flex-row flex-wrap items-center gap-3.5">
        {dadosDoPreparo(refeicao).map(({ icone, texto }) => (
          <DadoComIcone key={icone} icone={icone} texto={texto} />
        ))}
        {itens.length > 0 ? (
          <TouchableOpacity onPress={abrirPreparo} accessibilityRole="button">
            <DadoComIcone icone="book-outline" texto="Modo de preparo" />
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
}

/** "25 min · Fácil · 1 porção" do kit, só com o que o especialista informou. */
function dadosDoPreparo(refeicao: DietMeal) {
  const dados: {
    icone: 'time-outline' | 'speedometer-outline' | 'people-outline';
    texto: string;
  }[] = [];
  if (refeicao.prep_minutes)
    dados.push({ icone: 'time-outline', texto: `${refeicao.prep_minutes} min` });
  if (refeicao.difficulty)
    dados.push({ icone: 'speedometer-outline', texto: textoDaDificuldade(refeicao.difficulty) });
  if (refeicao.servings)
    dados.push({ icone: 'people-outline', texto: textoDasPorcoes(refeicao.servings) });
  return dados;
}

/** "Frango, arroz & salada": os nomes do prato, com o último ligado por "&". */
function tituloDoPrato(itens: ItemDoPrato[]): string {
  const nomes = itens.map((item) => item.food?.name).filter((nome): nome is string => !!nome);
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} & ${nomes[nomes.length - 1]}`;
}

function TotalDoPrato({ aberta }: { aberta: RefeicaoAberta }) {
  const cores = useCores();
  const escalar = useEscala();
  const calorias = Math.round(aberta.macros.calorias);
  const percentual = percentualDaMeta(aberta.macros.calorias, aberta.metaDiaria.calorias);

  return (
    <Vidro classeExterna="mt-4" className="flex-row items-center gap-4 p-4">
      <View className="flex-1">
        <Text className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-placeholder">
          Total do prato
        </Text>
        <View className="mt-1 flex-row items-baseline gap-[0.3125rem]">
          <Text className="font-display-black text-[2.125rem] tracking-tight text-foreground">
            {calorias}
          </Text>
          <Text className="text-[0.8125rem] font-bold text-muted-foreground">kcal</Text>
        </View>
        <Text className="mt-[0.1875rem] text-[0.71875rem] text-muted-foreground">
          {percentual}% da meta diária
        </Text>
      </View>
      <Anel
        valor={aberta.macros.calorias}
        meta={aberta.metaDiaria.calorias}
        rotulo={`${percentual}%`}
        sub="da meta diária"
        tamanho={76}
        espessura={8}
        brilho={12}
      >
        <Ionicons name="flame" size={escalar(26)} color={cores.primary} />
      </Anel>
    </Vidro>
  );
}

interface AlimentosDoPratoProps {
  itens: ItemDoPrato[];
  trocando: boolean;
  onAlternar: () => void;
  onTrocar: (item: ItemDoPrato) => void;
}

function AlimentosDoPrato({ itens, trocando, onAlternar, onTrocar }: AlimentosDoPratoProps) {
  return (
    <>
      <TituloDeSecao estilo="rotulo" acao={trocando ? 'Pronto' : 'Substituir'} onAcao={onAlternar}>
        Alimentos
      </TituloDeSecao>
      {itens.map((item) => (
        <LinhaDoAlimento
          key={item.id}
          icone="restaurant-outline"
          nome={item.food?.name ?? 'Alimento'}
          sub={porcaoDoItem(item)}
          direita={<PontaDoAlimento item={item} trocando={trocando} />}
          onPress={trocando ? () => onTrocar(item) : undefined}
          rotuloDeAcessibilidade={trocando ? `Trocar ${item.food?.name ?? 'alimento'}` : undefined}
        />
      ))}
      {itens.length === 0 ? (
        <Text className="py-6 text-center text-micro text-muted-foreground">
          Essa refeição ainda não tem alimentos.
        </Text>
      ) : null}
    </>
  );
}

function porcaoDoItem(item: ItemDoPrato): string {
  const proteina = Math.round(macrosDosItens([item]).proteina);
  return `${Number(item.quantity)} ${item.unit ?? item.food?.serving_unit ?? 'g'} · ${proteina} g proteína`;
}

function PontaDoAlimento({ item, trocando }: { item: ItemDoPrato; trocando: boolean }) {
  const cores = useCores();
  const escalar = useEscala();
  if (trocando) {
    return <Ionicons name="swap-horizontal" size={escalar(18)} color={cores.primaryText} />;
  }
  return (
    <Text className="text-[0.78125rem] font-bold text-foreground">
      {Math.round(macrosDosItens([item]).calorias)}
    </Text>
  );
}
