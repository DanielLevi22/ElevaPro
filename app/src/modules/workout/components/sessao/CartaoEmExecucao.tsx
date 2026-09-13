import { formatarDecimal, type SerieFeita, type WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';

/**
 * O exercício em execução — o único cartão com borda e brilho da primária na
 * tela, porque é onde o aluno está.
 *
 * Em cima, a foto, o nome e a faixa da prescrição com a evolução de carga; em
 * baixo, uma célula por série (feita, atual, pendente) e o botão que abre o
 * cronômetro da série atual. O kit escreve "Concluir série" nesse botão; aqui
 * ele é "Iniciar série", porque a série é registrada no cronômetro, e não ao
 * tocar aqui (decisão de produto, #295).
 *
 * @example
 * <CartaoEmExecucao item={atual} feitas={sessao.feitas[atual.id] ?? []} ganho={2.5} … />
 */
interface CartaoEmExecucaoProps {
  item: WorkoutExercise;
  feitas: readonly SerieFeita[];
  /** Quilos a mais que a última vez. Nulo quando não subiu. */
  ganho: number | null;
  /** Abre o cronômetro da série. Nada é registrado até o aluno concluir lá. */
  onIniciar: () => void;
  onAjustar: () => void;
}

export function CartaoEmExecucao({
  item,
  feitas,
  ganho,
  onIniciar,
  onAjustar,
}: CartaoEmExecucaoProps) {
  const total = item.sets ?? 0;
  const proxima = Math.min(feitas.length + 1, total);

  return (
    <Vidro destaque classeExterna="mt-3">
      <View className="bg-primary/10 px-[0.9375rem] pb-[0.9375rem] pt-3.5">
        <View className="absolute bottom-0 left-0 top-0 w-[0.1875rem] bg-primary" />
        <Identificacao item={item} onAjustar={onAjustar} />
        <FaixaDaPrescricao item={item} ganho={ganho} />
      </View>

      <View className="px-[0.9375rem] pb-[0.9375rem] pt-[0.8125rem]">
        <View className="mb-2 flex-row items-baseline justify-between">
          <Text className="text-[0.59375rem] font-extrabold uppercase tracking-[0.14em] text-placeholder">
            Séries
          </Text>
          <Text className="text-[0.6875rem] font-bold text-muted-foreground">
            {feitas.length} de {total} concluídas
          </Text>
        </View>
        <CelulasDasSeries total={total} feitas={feitas} />
        <View className="mt-[0.8125rem]">
          <BotaoDeDestaque
            rotulo={`Iniciar série ${proxima}`}
            icone="play"
            tamanho="cartao"
            onPress={onIniciar}
          />
        </View>
      </View>
    </Vidro>
  );
}

const TAMANHO_DO_LAPIS = 15;
/** O anel de 3 em volta do ponto "em execução", a 25% da primária. */
const ANEL_DO_PONTO = 3;

function Identificacao({ item, onAjustar }: { item: WorkoutExercise; onAjustar: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();

  return (
    <View className="flex-row items-center gap-3">
      <Image
        source={fotoDoGrupo(item.exercise?.muscle_group)}
        className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-[0.9375rem] border-[0.09375rem] border-primary/60"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <View
            className="h-1.5 w-1.5 rounded-full bg-primary"
            style={{ boxShadow: brilho({ blur: 0, espalhamento: ANEL_DO_PONTO }, { alfa: 0.25 }) }}
          />
          <Text className="text-[0.625rem] font-extrabold uppercase tracking-[0.14em] text-primary-text">
            Em execução
          </Text>
        </View>
        <Text
          numberOfLines={1}
          className="mt-[0.1875rem] font-display-black text-[1.25rem] tracking-tight text-foreground"
        >
          {item.exercise?.name ?? 'Exercício'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onAjustar}
        accessibilityRole="button"
        accessibilityLabel="Ajustar séries, carga e descanso"
        className="h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-[0.6875rem] bg-glass-strong"
      >
        <Ionicons name="pencil" size={escalar(TAMANHO_DO_LAPIS)} color={cores.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

const TAMANHO_DA_SETA = 12;

/** "4 × 8-10 · 45 kg · 90 s", e a evolução em verde quando a carga subiu. */
function FaixaDaPrescricao({ item, ganho }: { item: WorkoutExercise; ganho: number | null }) {
  const cores = useCores();
  const escalar = useEscala();
  const carga = item.weight ? `${String(item.weight).replace('.', ',')} kg` : '—';
  const descanso = item.rest_seconds ? `${item.rest_seconds} s` : '—';

  return (
    <View className="mt-3.5 flex-row overflow-hidden rounded-[0.875rem] bg-glass-strong">
      <CelulaDaFaixa valor={`${item.sets ?? 0} × ${item.reps ?? '—'}`} rotulo="Séries" />
      <CelulaDaFaixa valor={carga} rotulo="Carga" />
      <CelulaDaFaixa valor={descanso} rotulo="Descanso" />
      <View
        className={cn(
          'flex-1 items-center px-1.5 py-[0.5625rem]',
          ganho ? 'bg-metrica-passos/15' : null
        )}
      >
        <View className="flex-row items-center gap-[0.1875rem]">
          {ganho ? (
            <Ionicons
              name="trending-up"
              size={escalar(TAMANHO_DA_SETA)}
              color={cores.metricaPassos}
            />
          ) : null}
          <Text
            className={cn(
              'font-display-black text-sm tracking-tight',
              ganho ? 'text-metrica-passos' : 'text-placeholder'
            )}
          >
            {ganho ? formatarDecimal(ganho) : '—'}
          </Text>
        </View>
        <RotuloDaFaixa>Evolução</RotuloDaFaixa>
      </View>
    </View>
  );
}

function CelulaDaFaixa({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View className="flex-1 items-center px-1.5 py-[0.5625rem]">
      <Text numberOfLines={1} className="font-display-black text-sm tracking-tight text-foreground">
        {valor}
      </Text>
      <RotuloDaFaixa>{rotulo}</RotuloDaFaixa>
    </View>
  );
}

function RotuloDaFaixa({ children }: { children: string }) {
  return (
    <Text className="mt-0.5 text-[0.53125rem] font-bold uppercase tracking-[0.12em] text-placeholder">
      {children}
    </Text>
  );
}

const TAMANHO_DO_CHECK = 13;
/** O brilho da célula atual: `0 6px 16px -8px` da primária. */
const BRILHO_DA_ATUAL = { y: 6, blur: 16, espalhamento: -8 } as const;

/** Uma célula por série, na ordem: a primeira sem registro é a atual. */
function CelulasDasSeries({ total, feitas }: { total: number; feitas: readonly SerieFeita[] }) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }, (_, indice) => (
        <CelulaDaSerie
          // biome-ignore lint/suspicious/noArrayIndexKey: a série é a própria posição
          key={indice}
          numero={indice + 1}
          feita={feitas[indice]}
          atual={indice === feitas.length}
        />
      ))}
    </View>
  );
}

interface CelulaDaSerieProps {
  numero: number;
  feita: SerieFeita | undefined;
  atual: boolean;
}

/** Feita em verde, com check e repetições; a atual em primária com brilho; a pendente em vidro. */
function CelulaDaSerie({ numero, feita, atual }: CelulaDaSerieProps) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const tom = feita ? 'feita' : atual ? 'atual' : 'pendente';

  return (
    <View
      className={cn(
        'h-[3.25rem] flex-1 items-center justify-center gap-0.5 rounded-[0.875rem] border-[0.09375rem]',
        FUNDO_DA_CELULA[tom]
      )}
      style={atual ? { boxShadow: brilho(BRILHO_DA_ATUAL) } : undefined}
    >
      {feita ? (
        <Ionicons name="checkmark" size={escalar(TAMANHO_DO_CHECK)} color={cores.metricaPassos} />
      ) : (
        <Text
          className={cn(
            'text-[0.53125rem] font-extrabold uppercase tracking-[0.12em]',
            atual ? 'text-primary-text' : 'text-placeholder'
          )}
        >
          S{numero}
        </Text>
      )}
      <Text
        className={cn('font-display-black text-[0.9375rem] tracking-tight', TEXTO_DA_CELULA[tom])}
      >
        {feita?.reps ?? '—'}
      </Text>
    </View>
  );
}

const FUNDO_DA_CELULA = {
  feita: 'border-transparent bg-metrica-passos/15',
  atual: 'border-primary bg-primary/20',
  pendente: 'border-transparent bg-glass-strong',
} as const;

const TEXTO_DA_CELULA = {
  feita: 'text-metrica-passos',
  atual: 'text-primary-text',
  pendente: 'text-placeholder',
} as const;
