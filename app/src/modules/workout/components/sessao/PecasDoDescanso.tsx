import { formatarCarga, type SerieFeita, type WorkoutExercise } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Anel } from '@/components/ui/Anel';
import { DadoComIcone } from '@/components/ui/DadoComIcone';
import { Vidro } from '@/components/ui/Vidro';
import { cn } from '@/lib/utils';
import { comOpacidade, useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';

/**
 * O descanso em tela cheia do kit: o anel com o tempo, o resumo da série que
 * acabou, a série que vem e os controles.
 */

const SEGUNDOS_POR_MINUTO = 60;

interface AnelDoDescansoProps {
  restante: number;
  total: number;
}

/** O anel pontilhado com "00:45" no meio, os dois-pontos na primária. */
export function AnelDoDescanso({ restante, total }: AnelDoDescansoProps) {
  const mm = String(Math.floor(restante / SEGUNDOS_POR_MINUTO)).padStart(2, '0');
  const ss = String(restante % SEGUNDOS_POR_MINUTO).padStart(2, '0');

  return (
    <View className="mt-2 items-center">
      <Anel
        valor={restante}
        meta={total}
        rotulo={`Descanso: ${mm}:${ss}`}
        tamanho={166}
        espessura={5}
        brilho={10}
        pontilhado
        ponto
      >
        <Text className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-hero-secondary">
          Descanso
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
        <Text className="mt-1 text-[0.78125rem] text-hero-secondary">Intervalo de {total} s</Text>
      </Anel>
    </View>
  );
}

const TAMANHO_DO_ICONE_DO_RESUMO = 17;

/**
 * Reps, carga e status da série que acabou de ser feita.
 *
 * O kit tem uma quarta célula, PSE da série. Não entrou: o app pede a PSE uma
 * vez, no fim da sessão, e perguntar a cada série seria coletar um dado novo
 * — que precisaria de revisão LGPD própria — só para preencher a célula.
 */
export function ResumoDaSerie({ serie }: { serie: SerieFeita }) {
  const celulas = [
    { icone: 'repeat', rotulo: 'Reps', valor: serie.reps === null ? '—' : String(serie.reps) },
    {
      icone: 'barbell-outline',
      rotulo: 'Carga',
      valor: serie.carga === null ? '—' : formatarCarga(serie.carga).replace(' kg', ''),
      unidade: serie.carga === null ? undefined : 'kg',
    },
    { icone: 'checkmark-circle-outline', rotulo: 'Status', valor: 'Concluída', status: true },
  ] as const;

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
  ultima: boolean;
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

interface ProximaSerieProps {
  item: WorkoutExercise;
  numero: number;
}

/** "Série 2 de 4 · Remada Curvada", com a foto do grupo e a prescrição. */
export function ProximaSerie({ item, numero }: ProximaSerieProps) {
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
          <DadoComIcone icone="repeat" texto={`${item.reps ?? '—'} reps`} />
          {item.rest_seconds ? (
            <DadoComIcone icone="time-outline" texto={`${item.rest_seconds} s descanso`} />
          ) : null}
        </View>
      </View>
    </Vidro>
  );
}

const PASSO_DO_AJUSTE = 15;
const TAMANHO_DO_ICONE_LATERAL = 21;
const TAMANHO_DO_PLAY = 30;
const BRILHO_DO_RETOMAR = 34;

interface ControlesDoDescansoProps {
  onAjustar: (segundos: number) => void;
  onRetomar: () => void;
}

/** −15 s, Retomar e +15 s. Retomar encerra o descanso e volta à série. */
export function ControlesDoDescanso({ onAjustar, onRetomar }: ControlesDoDescansoProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="mt-4 flex-row items-center justify-center gap-[1.875rem]">
      <BotaoLateral icone="play-back" rotulo="−15 s" onPress={() => onAjustar(-PASSO_DO_AJUSTE)} />
      <View className="items-center gap-1.5">
        <TouchableOpacity
          onPress={onRetomar}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Retomar o treino"
          className="h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full bg-primary"
          style={{
            boxShadow: [
              {
                offsetX: 0,
                offsetY: 0,
                blurRadius: escalar(BRILHO_DO_RETOMAR),
                color: comOpacidade(cores.primary, 1),
              },
            ],
          }}
        >
          <Ionicons name="play" size={escalar(TAMANHO_DO_PLAY)} color={cores.primaryForeground} />
        </TouchableOpacity>
        <Text className="text-[0.65625rem] font-bold text-primary-text">Retomar</Text>
      </View>
      <BotaoLateral
        icone="play-forward"
        rotulo="+15 s"
        onPress={() => onAjustar(PASSO_DO_AJUSTE)}
      />
    </View>
  );
}

interface BotaoLateralProps {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  onPress: () => void;
}

function BotaoLateral({ icone, rotulo, onPress }: BotaoLateralProps) {
  const cores = useCores();
  const escalar = useEscala();

  return (
    <View className="items-center gap-1.5">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo.startsWith('+') ? 'Mais' : 'Menos'} 15 segundos de descanso`}
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
