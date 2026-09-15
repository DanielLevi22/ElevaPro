import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BarraDeDuasAcoes } from '@/components/ui/BarraDeDuasAcoes';
import { BarraDeProgresso } from '@/components/ui/BarraDeProgresso';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { CabecalhoSobreFoto } from '@/components/ui/CabecalhoSobreFoto';
import { GlassScreen } from '@/components/ui/GlassScreen';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import {
  type ListaDoAluno,
  PERIODOS,
  type Periodo,
  useListaDeCompras,
} from '../../hooks/useListaDeCompras';
import type { ItemDeCompra } from '../../services/listaDeCompras';

/**
 * Tela 7 do fluxo de nutrição do kit: o período, o quanto já foi comprado e os
 * itens por grupo do catálogo.
 *
 * O preço do cartão de progresso é estimativa do assistente, sempre com "≈", e
 * some quando ela não vem. O assistente de lista e o modo de preparo, que a
 * tela antiga do member tinha, continuam lá: o kit não os desenha para o aluno.
 *
 * @example
 * <ListaDeComprasScreen alunoId={user.id} obterToken={() => token} />
 */
export function ListaDeComprasScreen({
  alunoId,
  obterToken,
}: {
  alunoId: string;
  obterToken: () => string;
}) {
  const router = useRouter();
  const lista = useListaDeCompras(alunoId, { obterToken });

  return (
    <GlassScreen
      bottomSpace="actionBar"
      overlay={
        <BarraDeDuasAcoes
          secundaria={{
            rotulo: 'Limpar',
            icone: 'refresh',
            onPress: lista.limpar,
            desabilitada: lista.comprados.size === 0,
          }}
          principal={{
            rotulo: 'Compartilhar',
            icone: 'share-outline',
            onPress: lista.compartilhar,
            desabilitada: lista.total === 0,
          }}
        />
      }
    >
      <View className="pt-1.5">
        <CabecalhoSobreFoto
          sobrelinha="Gerada do seu plano"
          titulo="Lista de compras"
          onVoltar={router.back}
          direita={
            <BotaoRedondo
              icone="share-outline"
              rotulo="Compartilhar lista"
              onPress={lista.compartilhar}
            />
          }
        />
      </View>
      <SeletorDePeriodo dias={lista.dias} onEscolher={lista.escolherDias} />
      <ProgressoDaCompra lista={lista} />
      {lista.grupos.map((grupo) => (
        <View key={grupo.rotulo}>
          <TituloDeSecao
            estilo="rotulo"
            acao={`${grupo.itens.length} ${grupo.itens.length === 1 ? 'item' : 'itens'}`}
          >
            {grupo.rotulo}
          </TituloDeSecao>
          {grupo.itens.map((item) => (
            <LinhaDaCompra
              key={item.chave}
              item={item}
              comprado={lista.comprados.has(item.chave)}
              onAlternar={() => lista.alternar(item.chave)}
            />
          ))}
        </View>
      ))}
      {lista.total === 0 ? (
        <Text className="px-6 py-10 text-center text-legenda text-muted-foreground">
          {lista.temPlano
            ? 'Seu plano ainda não tem alimentos.'
            : 'Sem plano alimentar, não há lista.'}
        </Text>
      ) : null}
    </GlassScreen>
  );
}

/** O brilho do período escolhido: `0 8px 22px -8px` da primária. */
const BRILHO_DO_ESCOLHIDO = { y: 8, blur: 22, espalhamento: -8 } as const;

function SeletorDePeriodo({
  dias,
  onEscolher,
}: {
  dias: Periodo;
  onEscolher: (dias: Periodo) => void;
}) {
  const brilho = useBrilho();

  return (
    <View className="mt-4 flex-row gap-[0.4375rem]">
      {PERIODOS.map((periodo) => {
        const escolhido = periodo === dias;
        const rotulo = `${periodo} dias`;
        return (
          <TouchableOpacity
            key={periodo}
            onPress={() => onEscolher(periodo)}
            accessibilityRole="button"
            accessibilityState={{ selected: escolhido }}
            className="flex-1"
          >
            {escolhido ? (
              <View
                className="h-10 items-center justify-center rounded-[0.875rem] bg-primary"
                style={{ boxShadow: brilho(BRILHO_DO_ESCOLHIDO) }}
              >
                <Text className="text-[0.78125rem] font-bold text-primary-foreground">
                  {rotulo}
                </Text>
              </View>
            ) : (
              <Vidro
                classeExterna="rounded-[0.875rem]"
                className="h-10 items-center justify-center rounded-[0.875rem]"
              >
                <Text className="text-[0.78125rem] font-bold text-muted-foreground">{rotulo}</Text>
              </Vidro>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ProgressoDaCompra({ lista }: { lista: ListaDoAluno }) {
  // A marcação pode sobrar de um item que saiu do plano: conta só os que estão na lista.
  const comprados = lista.grupos
    .flatMap((g) => g.itens)
    .filter((i) => lista.comprados.has(i.chave)).length;

  return (
    <Vidro classeExterna="mt-3" className="p-4">
      <View className="mb-[0.5625rem] flex-row items-baseline justify-between">
        <Text className="text-[0.84375rem] font-bold text-foreground">{`${comprados} de ${lista.total} itens`}</Text>
        {lista.preco ? (
          <Text className="text-[0.78125rem] text-muted-foreground">{lista.preco}</Text>
        ) : null}
      </View>
      <BarraDeProgresso percentual={lista.total === 0 ? 0 : (comprados / lista.total) * 100} />
    </Vidro>
  );
}

interface LinhaDaCompraProps {
  item: ItemDeCompra;
  comprado: boolean;
  onAlternar: () => void;
}

function LinhaDaCompra({ item, comprado, onAlternar }: LinhaDaCompraProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <TouchableOpacity
      onPress={onAlternar}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.nome}, ${item.quantidade}`}
      accessibilityState={{ checked: comprado }}
      className={cn('mb-[0.5625rem]', comprado ? 'opacity-[0.55]' : null)}
    >
      <Vidro className="flex-row items-center gap-3 p-3">
        <View
          className={cn(
            'h-6 w-6 shrink-0 items-center justify-center rounded-lg',
            comprado ? 'bg-metrica-proteina' : 'border-[0.09375rem] border-placeholder'
          )}
        >
          {comprado ? (
            <Ionicons name="checkmark" size={escalar(14)} color={cores.sobreMetrica} />
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          className={cn(
            'min-w-0 flex-1 text-[0.875rem] font-semibold text-foreground',
            comprado ? 'line-through' : null
          )}
        >
          {item.nome}
        </Text>
        <Text className="text-[0.78125rem] font-bold text-muted-foreground">{item.quantidade}</Text>
      </Vidro>
    </TouchableOpacity>
  );
}
