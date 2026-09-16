import {
  contagem,
  dataCurtaDoInstante,
  formatarVolume,
  type SessaoComSeries,
  seriesDaSessaoAnterior,
  volumeDasSeries,
  type Workout,
} from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { Chip } from '@/components/ui/Chip';
import { TelaDeVidroComFoto } from '@/components/ui/TelaDeVidroComFoto';
import { Vidro } from '@/components/ui/Vidro';
import { useBrilho, useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { useContextoDoTreino } from '../../../hooks/useContextoDoTreino';

/**
 * O pré-início do kit (tela 4): o treino em letra grande, quantas séries tem e
 * como foi da última vez.
 *
 * Duas diferenças do kit, as duas pelo mesmo motivo de sempre — não afirmar o
 * que o app não sabe:
 *
 * - **sem "~52 min"**: a prescrição não tem duração, e a issue irmã já tirou a
 *   estimativa dos cartões do treino;
 * - **com voltar**: o kit não desenha nenhum, e no iOS a tela ficaria sem saída
 *   antes de o treino começar.
 *
 * @example
 * <PreInicioDoTreino treino={treino} anterior={anterior} onIniciar={iniciar} onVoltar={router.back} />
 */
interface PreInicioDoTreinoProps {
  treino: Workout;
  anterior: SessaoComSeries | null;
  onIniciar: () => void;
  onVoltar: () => void;
}

const TAMANHO_DO_HALTER = 56;
const BRILHO_DO_ICONE = { blur: 44, espalhamento: -6 } as const;

export function PreInicioDoTreino({
  treino,
  anterior,
  onIniciar,
  onVoltar,
}: PreInicioDoTreinoProps) {
  const exercicios = treino.exercises ?? [];
  const series = exercicios.reduce((soma, item) => soma + (item.sets ?? 0), 0);
  const { letra, fase, objetivo } = useContextoDoTreino(treino);
  const chips = [letra, fase, objetivo].filter((chip): chip is string => chip !== null);

  return (
    <TelaDeVidroComFoto
      image={fotoDoGrupo(treino.muscle_group)}
      centered
      overlay={
        // Fora da rolagem, no mesmo lugar do topo das outras telas (`pt-14`,
        // `px-4`): dentro dela ele desceria junto com o conteúdo centered.
        <View className="absolute left-4 top-14">
          <BotaoRedondo icone="chevron-left" rotulo="Voltar" onPress={onVoltar} />
        </View>
      }
    >
      <View className="items-center">
        <IconeInclinado />
        <Text className="mt-[2.375rem] text-center font-display-black text-[2.25rem] uppercase leading-tight tracking-tight text-hero">
          {treino.title}
        </Text>
        <Text className="mt-3 text-[0.9375rem] font-medium text-hero-secondary">
          {contagem(exercicios.length, 'exercício', 'exercícios')} ·{' '}
          {contagem(series, 'série', 'séries')}
        </Text>
        {chips.length > 0 ? (
          <View className="mt-5 flex-row flex-wrap justify-center gap-[0.4375rem]">
            {chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </View>
        ) : null}
        <View className="mt-11 w-full">
          <BotaoDeDestaque
            rotulo="Iniciar treino"
            icone="play"
            tamanho="grande"
            onPress={onIniciar}
          />
        </View>
        {anterior?.completed_at ? (
          <Text className="mt-4 text-[0.78125rem] text-placeholder">
            Último: {dataCurtaDoInstante(anterior.completed_at)} · volume{' '}
            {formatarVolume(
              volumeDasSeries(Object.values(seriesDaSessaoAnterior(anterior)).flat())
            )}
          </Text>
        ) : null}
      </View>
    </TelaDeVidroComFoto>
  );
}

/** O halter no quadrado de vidro inclinado 12°, com o aro e o brilho da primária. */
function IconeInclinado() {
  const cores = useCores();
  const escalar = useEscala();
  const brilho = useBrilho();

  return (
    <View className="rotate-12 rounded-[2.5rem]" style={{ boxShadow: brilho(BRILHO_DO_ICONE) }}>
      <Vidro
        classeExterna="rounded-[2.5rem]"
        className="h-[7.75rem] w-[7.75rem] items-center justify-center rounded-[2.5rem] border-primary"
      >
        <View className="-rotate-12">
          <Ionicons name="barbell" size={escalar(TAMANHO_DO_HALTER)} color={cores.primary} />
        </View>
      </Vidro>
    </View>
  );
}
