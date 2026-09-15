import {
  formatarCarga,
  formatarDuracao,
  type SerieFeita,
  type WorkoutExercise,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { textoDasRepeticoes } from './LinhasDaExecucao';

/**
 * As peças do cronômetro em tela cheia — o da série e o do descanso: o anel
 * com o tempo, o resumo da série que acabou, o cartão da série e os controles.
 */

const SEGUNDOS_POR_MINUTO = 60;

interface AnelDoCronometroProps {
  /** "Execução" ou "Descanso". */
  rotulo: string;
  /** O que o relógio mostra: o que passou na série, o que falta no descanso. */
  segundos: number;
  /** Quanto do anel está aceso, de 0 a `meta`. */
  valor: number;
  meta: number;
  legenda: string;
}

/**
 * O anel pontilhado com "00:45" no meio, os dois-pontos na primária.
 *
 * Na série o anel enche, e no descanso ele esvazia: um mostra o esforço
 * acumulando, o outro o tempo acabando.
 */
export function AnelDoCronometro({
  rotulo,
  segundos,
  valor,
  meta,
  legenda,
}: AnelDoCronometroProps) {
  const mm = String(Math.floor(segundos / SEGUNDOS_POR_MINUTO)).padStart(2, '0');
  const ss = String(segundos % SEGUNDOS_POR_MINUTO).padStart(2, '0');

  return (
    <View className="mt-2 items-center">
      <Anel
        valor={valor}
        meta={meta}
        rotulo={`${rotulo}: ${mm}:${ss}`}
        tamanho={166}
        espessura={5}
        brilho={10}
        pontilhado
        ponto
      >
        <Text className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-hero-secondary">
          {rotulo}
        </Text>
        <View className="mt-1 flex-row items-baseline gap-0.5">
          <Text className="font-display-black text-[3rem] leading-tight tracking-tight text-hero">
            {mm}
          </Text>
          <Text className="font-display-black text-[3rem] leading-tight text-primary">:</Text>
          <Text className="font-display-black text-[3rem] leading-tight tracking-tight text-hero">
            {ss}
          </Text>
        </View>
        <Text className="mt-1 text-[0.78125rem] text-hero-secondary">{legenda}</Text>
      </Anel>
    </View>
  );
}

const TAMANHO_DO_ICONE_DO_RESUMO = 17;

interface ResumoDaSerieProps {
  serie: SerieFeita;
  /** Quanto a série levou. Nulo quando foi concluída sem o cronômetro. */
  duracao: number | null;
}

/**
 * Reps, carga, tempo e status da série que acabou de ser feita.
 *
 * O kit tem PSE da série na terceira célula. Não entrou: o app pede a PSE uma
 * vez, no fim da sessão, e perguntar a cada série seria coletar um dado novo.
 * No lugar dela entra o tempo que o exercício levou, que o cronômetro mede e o
 * app só mostra — não grava.
 */
export function ResumoDaSerie({ serie, duracao }: ResumoDaSerieProps) {
  const celulas: CelulaDoResumoProps[] = [
    { icone: 'repeat', rotulo: 'Reps', valor: serie.reps === null ? '—' : String(serie.reps) },
    {
      icone: 'barbell-outline',
      rotulo: 'Carga',
      valor: serie.carga === null ? '—' : formatarCarga(serie.carga).replace(' kg', ''),
      unidade: serie.carga === null ? undefined : 'kg',
    },
    {
      icone: 'stopwatch-outline',
      rotulo: 'Tempo',
      valor: duracao === null ? '—' : formatarDuracao(duracao),
    },
    { icone: 'checkmark-circle-outline', rotulo: 'Status', valor: 'Concluída', status: true },
  ];

  return (
    <Vidro classeExterna="mt-1.5" className="flex-row px-1.5 py-3">
      {celulas.map((celula, indice) => (
        <CelulaDoResumo key={celula.rotulo} {...celula} ultima={indice === celulas.length - 1} />
      ))}
    </Vidro>
  );
}

interface CelulaDoResumoProps {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  valor: string;
  unidade?: string;
  status?: boolean;
  ultima?: boolean;
}

function CelulaDoResumo({ icone, rotulo, valor, unidade, status, ultima }: CelulaDoResumoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View
      className={cn(
        'flex-1 items-center gap-[0.3125rem]',
        ultima ? null : 'border-r border-glass-border'
      )}
    >
      <Ionicons
        name={icone}
        size={escalar(TAMANHO_DO_ICONE_DO_RESUMO)}
        color={status ? cores.primary : cores.mutedForeground}
      />
      <Text className="text-[0.59375rem] font-bold uppercase tracking-widest text-placeholder">
        {rotulo}
      </Text>
      <Text
        className={cn(
          'font-display-black tracking-tight',
          status ? 'text-[0.8125rem] text-primary-text' : 'text-[1.1875rem] text-foreground'
        )}
      >
        {valor}
      </Text>
      {unidade ? <Text className="-mt-0.5 text-[0.625rem] text-placeholder">{unidade}</Text> : null}
    </View>
  );
}

interface CartaoDaSerieProps {
  item: WorkoutExercise;
  numero: number;
}

/** "Série 2 de 4 · Remada Curvada", com a foto do grupo e a prescrição. */
export function CartaoDaSerie({ item, numero }: CartaoDaSerieProps) {
  return (
    <Vidro className="flex-row items-center gap-[0.8125rem] p-3">
      <Image
        source={fotoDoGrupo(item.exercise?.muscle_group)}
        className="h-[3.25rem] w-16 shrink-0 rounded-md"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View className="min-w-0 flex-1">
        <Text className="text-[0.6875rem] font-bold uppercase tracking-wide text-primary-text">
          Série {numero} de {item.sets ?? 0}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[0.96875rem] font-bold tracking-tight text-foreground"
        >
          {item.exercise?.name ?? 'Exercício'}
        </Text>
        <View className="mt-[0.1875rem] flex-row gap-3">
          <DadoComIcone icone="repeat" texto={textoDasRepeticoes(item.reps, 'reps')} />
          {item.rest_seconds ? (
            <DadoComIcone icone="time-outline" texto={`${item.rest_seconds} s descanso`} />
          ) : null}
        </View>
      </View>
    </Vidro>
  );
}

export interface BotaoDoCronometro {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  /** O que o leitor de tela anuncia, quando o rótulo curto não basta. */
  descricao?: string;
  onPress: () => void;
}

interface ControlesDoCronometroProps {
  esquerda: BotaoDoCronometro;
  direita: BotaoDoCronometro;
  correndo: boolean;
  /** O rótulo do play quando está parado: "Iniciar" na série, "Retomar" no descanso. */
  rotuloParado: string;
  onAlternar: () => void;
  /**
   * A saída discreta sob os botões: "Voltar à lista", "Pular descanso". O cardio
   * ao vivo não tem: finalizar já é um dos botões.
   */
  saida?: { rotulo: string; onPress: () => void };
}

const TAMANHO_DO_PLAY = 30;
const BRILHO_DO_PLAY = 34;

/**
 * Dois botões de vidro ao lado do play, que inicia e pausa. O que fica de cada
 * lado muda com a momento: zerar e concluir na série, −15 s e +15 s no descanso.
 */
export function ControlesDoCronometro({
  esquerda,
  direita,
  correndo,
  rotuloParado,
  onAlternar,
  saida,
}: ControlesDoCronometroProps) {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();
  const rotulo = correndo ? 'Pausar' : rotuloParado;

  return (
    <View className="mt-4 items-center">
      <View className="flex-row items-center justify-center gap-[1.875rem]">
        <BotaoLateral {...esquerda} />
        <View className="items-center gap-1.5">
          <TouchableOpacity
            onPress={onAlternar}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={rotulo}
            className="h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full bg-primary"
            style={{ boxShadow: brilho({ blur: BRILHO_DO_PLAY }) }}
          >
            <Ionicons
              name={correndo ? 'pause' : 'play'}
              size={escalar(TAMANHO_DO_PLAY)}
              color={cores.primaryForeground}
            />
          </TouchableOpacity>
          <Text className="text-[0.65625rem] font-bold text-primary-text">{rotulo}</Text>
        </View>
        <BotaoLateral {...direita} />
      </View>
      {saida ? (
        <TouchableOpacity onPress={saida.onPress} accessibilityRole="button" className="mt-4 py-2">
          <Text className="text-legenda font-semibold text-hero-secondary">{saida.rotulo}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const TAMANHO_DO_ICONE_LATERAL = 21;

function BotaoLateral({ icone, rotulo, descricao, onPress }: BotaoDoCronometro) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="items-center gap-1.5">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={descricao ?? rotulo}
      >
        <Vidro
          classeExterna="rounded-full"
          className="h-[3.375rem] w-[3.375rem] items-center justify-center rounded-full"
        >
          <Ionicons
            name={icone}
            size={escalar(TAMANHO_DO_ICONE_LATERAL)}
            color={cores.foreground}
          />
        </Vidro>
      </TouchableOpacity>
      <Text className="text-[0.65625rem] font-semibold text-placeholder">{rotulo}</Text>
    </View>
  );
}
