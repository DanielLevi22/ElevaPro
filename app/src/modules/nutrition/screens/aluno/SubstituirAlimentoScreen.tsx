import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useCores, useEscala } from '@/shared/design';
import { IconeDaRefeicao } from '../../components/aluno/IconeDaRefeicao';
import { type TrocaDoAlimento, useTrocaDoAlimento } from '../../hooks/useTrocaDoAlimento';
import { type ItemDoPrato, macrosDosItens } from '../../services/consumoDoDia';
import type { Equivalente } from '../../services/equivalenciaDaTroca';

/**
 * Tela 4 do fluxo de nutrição do kit: o alimento que sai, o aviso de como as
 * equivalências são calculadas e a lista de equivalentes com o que muda.
 *
 * "Trocar" escolhe; "Confirmar troca" grava. Dois passos porque a troca
 * reescreve o que o aluno comeu, e o especialista lê.
 *
 * @example
 * <SubstituirAlimentoScreen refeicaoId={id} itemId={item} data="2026-08-12" somenteLeitura={false} />
 */
interface SubstituirAlimentoScreenProps {
  refeicaoId: string;
  itemId: string;
  data: string;
  somenteLeitura: boolean;
}

export function SubstituirAlimentoScreen(props: SubstituirAlimentoScreenProps) {
  const router = useRouter();
  const troca = useTrocaDoAlimento(props);
  const horario = troca.refeicao?.meal_time?.slice(0, 5);
  const sobrelinha = [troca.refeicao?.name, horario].filter(Boolean).join(' · ');

  const confirmar = async () => {
    if (await troca.confirmar()) router.back();
  };

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{ rotulo: 'Cancelar', icone: 'close', onPress: router.back }}
          principal={{
            rotulo: 'Confirmar troca',
            icone: 'checkmark',
            onPress: confirmar,
            desabilitada: !troca.escolhido,
          }}
        />
      }
    >
      <View className="pt-1.5">
        <CabecalhoSobreFoto
          sobrelinha={sobrelinha || 'Refeição'}
          titulo="Substituir alimento"
          onVoltar={router.back}
        />
      </View>
      {troca.original ? (
        <ConteudoDaTroca troca={troca} original={troca.original} />
      ) : (
        <Text className="px-6 py-16 text-center text-legenda text-muted-foreground">
          Esse alimento não está mais na refeição.
        </Text>
      )}
    </GlassScreen>
  );
}

function ConteudoDaTroca({ troca, original }: { troca: TrocaDoAlimento; original: ItemDoPrato }) {
  return (
    <>
      <TituloDeSecao estilo="rotulo">Alimento atual</TituloDeSecao>
      <AlimentoAtual item={original} />
      <AvisoDaEquivalencia />
      <TituloDeSecao
        estilo="rotulo"
        acao={troca.ordem === 'calorias' ? 'Ordenar por proteína' : 'Ordenar por calorias'}
        onAcao={troca.alternarOrdem}
      >
        Equivalentes
      </TituloDeSecao>
      <ListaDeEquivalentes troca={troca} />
    </>
  );
}

function AlimentoAtual({ item }: { item: ItemDoPrato }) {
  const macros = macrosDosItens([item]);
  const unidade = item.unit ?? item.food?.serving_unit ?? 'g';

  return (
    <Vidro className="flex-row items-center gap-[0.8125rem] border-primary p-3.5">
      <IconeDaRefeicao nome={item.food?.name ?? ''} tamanho="atual" />
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[0.9375rem] font-bold tracking-tight text-foreground"
        >
          {item.food?.name ?? 'Alimento'}
        </Text>
        <Text className="mt-0.5 text-[0.75rem] text-muted-foreground">
          {`${Number(item.quantity)} ${unidade} · ${Math.round(macros.calorias)} kcal · ${Math.round(macros.proteina)} g proteína`}
        </Text>
      </View>
    </Vidro>
  );
}

function AvisoDaEquivalencia() {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <Vidro classeExterna="mt-2.5" className="flex-row items-start gap-3 p-3.5">
      <View className="h-8 w-8 shrink-0 items-center justify-center rounded-[0.6875rem] bg-primary/20">
        <Ionicons name="sparkles" size={escalar(15)} color={cores.primary} />
      </View>
      <Text className="flex-1 text-[0.78125rem] leading-[1.125rem] text-muted-foreground">
        Equivalências calculadas para manter sua meta de proteína do dia. Seu especialista vê a
        troca.
      </Text>
    </Vidro>
  );
}

function ListaDeEquivalentes({ troca }: { troca: TrocaDoAlimento }) {
  const cores = useCores();
  if (troca.carregando) return <ActivityIndicator className="mt-6" color={cores.primary} />;
  if (troca.equivalentes.length === 0) {
    return (
      <Text className="py-6 text-center text-micro text-muted-foreground">
        Nenhum equivalente no catálogo para esse alimento.
      </Text>
    );
  }
  return (
    <>
      {troca.equivalentes.map((equivalente) => (
        <LinhaDoEquivalente
          key={equivalente.food.id}
          equivalente={equivalente}
          escolhido={troca.escolhido?.food.id === equivalente.food.id}
          onEscolher={() => troca.escolher(equivalente)}
        />
      ))}
    </>
  );
}

/** Com sinal de menos tipográfico, como o kit: "−12 kcal", "+1 g prot". */
function comSinal(valor: number): string {
  if (valor > 0) return `+${valor}`;
  if (valor < 0) return `−${Math.abs(valor)}`;
  return '0';
}

interface LinhaDoEquivalenteProps {
  equivalente: Equivalente;
  escolhido: boolean;
  onEscolher: () => void;
}

function LinhaDoEquivalente({ equivalente, escolhido, onEscolher }: LinhaDoEquivalenteProps) {
  const { food, quantidade, diferencaCalorias, diferencaProteina } = equivalente;
  // A troca que acrescenta calorias em âmbar, a que tira ou empata em verde.
  const tom = diferencaCalorias > 0 ? 'text-texto-macro-gordura' : 'text-texto-macro-proteina';

  return (
    <Vidro
      classeExterna="mb-[0.5625rem]"
      className={cn('flex-row items-center gap-3 p-3', escolhido ? 'border-primary' : null)}
    >
      <IconeDaRefeicao nome={food.name} tamanho="troca" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[0.875rem] font-semibold text-foreground">
          {food.name}
        </Text>
        <View className="mt-[0.1875rem] flex-row gap-2">
          <Text className="text-[0.6875rem] text-muted-foreground">{`${quantidade} ${food.serving_unit}`}</Text>
          <Text
            className={cn('text-[0.6875rem] font-bold', tom)}
          >{`${comSinal(diferencaCalorias)} kcal`}</Text>
          <Text
            className={cn('text-[0.6875rem] font-bold', tom)}
          >{`${comSinal(diferencaProteina)} g prot`}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onEscolher}
        accessibilityRole="button"
        accessibilityLabel={`Trocar por ${quantidade} ${food.serving_unit} de ${food.name}`}
        accessibilityState={{ selected: escolhido }}
        className={cn(
          'rounded-full px-[0.8125rem] py-[0.4375rem]',
          escolhido ? 'bg-primary' : 'bg-glass-strong'
        )}
      >
        <Text
          className={cn(
            'text-[0.6875rem] font-extrabold uppercase tracking-wider',
            escolhido ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {escolhido ? 'Escolhido' : 'Trocar'}
        </Text>
      </TouchableOpacity>
    </Vidro>
  );
}
