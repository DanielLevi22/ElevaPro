import type { Food } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { BotaoDoAssistente } from '../../components/aluno/BotaoDoAssistente';
import { CategoriasDoCatalogo } from '../../components/aluno/CategoriasDoCatalogo';
import { LinhaDoAlimento } from '../../components/aluno/LinhaDoAlimento';
import { TelaDaNutricao } from '../../components/aluno/TelaDaNutricao';
import { type BuscaDeAlimento, useBuscaDeAlimento } from '../../hooks/useBuscaDeAlimento';
import { numeroDoBanco } from '../../services/consumoDoDia';

/**
 * Tela 3 do fluxo de nutrição do kit: o que falta do dia, a busca, as
 * categorias do catálogo e os resultados com "+".
 *
 * Três partes do kit não entraram aqui:
 * - o sino, porque o aluno não tem tela de notificações;
 * - "Sugestões do assistente", que chega com a rota dela no terceiro PR da #298;
 * - "receita" no campo de busca, porque o catálogo só tem alimento.
 *
 * O botão de filtro ao lado da busca põe primeiro o que tem mais proteína por
 * caloria — o único filtro que o catálogo sustenta sem dado novo.
 *
 * @example
 * <BuscarAlimentoScreen alunoId={user.id} primeiroNome="Daniel" somenteLeitura={false} />
 */
interface BuscarAlimentoScreenProps {
  alunoId: string;
  primeiroNome: string;
  somenteLeitura: boolean;
}

export function BuscarAlimentoScreen({
  alunoId,
  primeiroNome,
  somenteLeitura,
}: BuscarAlimentoScreenProps) {
  const router = useRouter();
  const busca = useBuscaDeAlimento(alunoId, { somenteLeitura });
  const [todas, setTodas] = useState(false);

  return (
    <TelaDaNutricao
      sobreposicao={<BotaoDoAssistente onPress={() => router.push(ROUTES.NUTRITION.ASSISTANT)} />}
    >
      <Saudacao
        primeiroNome={primeiroNome}
        faltamCalorias={busca.faltamCalorias}
        onVoltar={router.back}
      />
      <Text className="mt-[1.125rem] text-[1.6875rem] font-bold leading-[1.94rem] tracking-tight text-hero">
        {'O que você vai\ncomer '}
        <Text className="text-primary-text">agora?</Text>
      </Text>
      <CampoDeBusca busca={busca} />
      <TituloDeSecao
        estilo="rotulo"
        acao={todas ? 'Menos' : 'Ver tudo'}
        onAcao={() => setTodas((atual) => !atual)}
      >
        Categorias
      </TituloDeSecao>
      <CategoriasDoCatalogo
        escolhida={busca.categoria}
        todas={todas}
        onEscolher={busca.escolherCategoria}
      />
      <Resultados busca={busca} />
    </TelaDaNutricao>
  );
}

interface SaudacaoProps {
  primeiroNome: string;
  faltamCalorias: number;
  onVoltar: () => void;
}

function Saudacao({ primeiroNome, faltamCalorias, onVoltar }: SaudacaoProps) {
  return (
    <View className="flex-row items-center gap-[0.6875rem] pt-1.5">
      <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={onVoltar} />
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-glass-strong">
        <Text className="text-[0.9375rem] font-bold text-hero">
          {primeiroNome.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[0.9375rem] font-bold tracking-tight text-hero">
          Olá, {primeiroNome}
        </Text>
        <Text className="text-[0.75rem] text-hero-secondary">
          {faltamCalorias > 0
            ? `Faltam ${faltamCalorias} kcal hoje`
            : 'Meta de calorias fechada hoje'}
        </Text>
      </View>
    </View>
  );
}

/** O brilho do botão de filtro: `0 10px 24px -10px` da primária. */
const BRILHO_DO_FILTRO = { y: 10, blur: 24, espalhamento: -10 } as const;

function CampoDeBusca({ busca }: { busca: BuscaDeAlimento }) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();

  return (
    <View className="mt-4 flex-row gap-2.5">
      <Vidro
        classeExterna="flex-1 rounded-2xl"
        className="h-12 flex-row items-center gap-[0.5625rem] rounded-2xl px-3.5"
      >
        <Ionicons name="search" size={escalar(17)} color={cores.placeholder} />
        <TextInput
          value={busca.consulta}
          onChangeText={busca.digitar}
          placeholder="Buscar alimento…"
          placeholderTextColor={cores.placeholder}
          returnKeyType="search"
          accessibilityLabel="Buscar alimento"
          className="flex-1 text-[0.84375rem] text-foreground"
        />
      </Vidro>
      <TouchableOpacity
        onPress={busca.alternarMaisProteina}
        accessibilityRole="button"
        accessibilityLabel="Mais proteína primeiro"
        accessibilityState={{ selected: busca.maisProteina }}
        className={cn(
          'h-12 w-12 items-center justify-center rounded-2xl',
          busca.maisProteina ? 'bg-primary' : 'border border-primary bg-glass-strong'
        )}
        style={busca.maisProteina ? { boxShadow: brilho(BRILHO_DO_FILTRO) } : undefined}
      >
        <Ionicons
          name="options-outline"
          size={escalar(19)}
          color={busca.maisProteina ? cores.primaryForeground : cores.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

function Resultados({ busca }: { busca: BuscaDeAlimento }) {
  const cores = useCores();
  const quantos = busca.resultados.length;

  return (
    <>
      <TituloDeSecao
        estilo="rotulo"
        acao={`${quantos} ${quantos === 1 ? 'resultado' : 'resultados'}`}
      >
        Resultados
      </TituloDeSecao>
      {busca.buscando ? <ActivityIndicator className="mt-4" color={cores.primary} /> : null}
      {!busca.buscando && quantos === 0 ? (
        <Text className="py-6 text-center text-micro text-muted-foreground">
          Nada no catálogo com esse nome.
        </Text>
      ) : null}
      {busca.buscando
        ? null
        : busca.resultados.map((food) => (
            <LinhaDoAlimento
              key={food.id}
              icone="nutrition-outline"
              corDoIcone={cores.textoProteina}
              nome={food.name}
              sub={resumoDoAlimento(food)}
              direita={<BotaoDeAdicionar nome={food.name} onPress={() => busca.adicionar(food)} />}
            />
          ))}
    </>
  );
}

/** "100 g · 165 kcal · 31 g prot", com a vírgula decimal. */
function resumoDoAlimento(food: Food): string {
  const decimal = (valor: number) => String(Math.round(valor * 10) / 10).replace('.', ',');
  return `${decimal(numeroDoBanco(food.serving_size))} ${food.serving_unit} · ${Math.round(numeroDoBanco(food.calories))} kcal · ${decimal(numeroDoBanco(food.protein))} g prot`;
}

function BotaoDeAdicionar({ nome, onPress }: { nome: string; onPress: () => void }) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar ${nome} ao que comi hoje`}
      className="h-7 w-7 items-center justify-center rounded-full bg-primary"
    >
      <Ionicons name="add" size={escalar(16)} color={cores.primaryForeground} />
    </TouchableOpacity>
  );
}
