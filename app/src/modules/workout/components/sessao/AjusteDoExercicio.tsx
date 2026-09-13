import { createWorkoutsService, type WorkoutExercise } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoDeDestaque } from '@/components/ui/BotaoDeDestaque';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { useCores, useEscala } from '@/shared/design';

const servicoDeTreinos = createWorkoutsService(supabase);

const MARGEM_DO_FUNDO = 16;

/**
 * O lápis do cartão em execução: séries, repetições, carga e descanso desta
 * sessão — e o vídeo do exercício, para quem pode editar o catálogo.
 *
 * Os quatro números mudam só a sessão: o que o aluno fez hoje não reescreve a
 * prescrição do especialista. O vídeo é o contrário — é do catálogo e vale para
 * todo mundo, por isso só aparece com a permissão `update Exercise` e é gravado
 * na hora.
 *
 * @example
 * <AjusteDoExercicio item={atual} podeEditarVideo={pode} onFechar={fechar} onSalvar={ajustar} />
 */
interface AjusteDoExercicioProps {
  item: WorkoutExercise | null;
  podeEditarVideo: boolean;
  onFechar: () => void;
  onSalvar: (item: WorkoutExercise) => void;
}

interface Campos {
  series: string;
  reps: string;
  carga: string;
  descanso: string;
  video: string;
}

function camposDo(item: WorkoutExercise): Campos {
  return {
    series: String(item.sets ?? ''),
    reps: item.reps ?? '',
    carga: item.weight ?? '',
    descanso: String(item.rest_seconds ?? ''),
    video: item.exercise?.video_url ?? '',
  };
}

/** A mensagem diz o valor recusado e o formato que vale. */
function problemaDos(campos: Campos): string | null {
  const series = Number.parseInt(campos.series, 10);
  if (!(series > 0)) return `Séries "${campos.series}" não vale: use um número maior que zero.`;
  if (!campos.reps.trim()) return 'Repetições em branco: use um número ou uma faixa, como 8-10.';
  const descanso = Number.parseInt(campos.descanso || '0', 10);
  if (Number.isNaN(descanso) || descanso < 0) {
    return `Descanso "${campos.descanso}" não vale: use segundos, zero ou mais.`;
  }
  return null;
}

export function AjusteDoExercicio({
  item,
  podeEditarVideo,
  onFechar,
  onSalvar,
}: AjusteDoExercicioProps) {
  const insets = useSafeAreaInsets();
  const escalar = useEscala();
  const [campos, setCampos] = useState<Campos | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCampos(item ? camposDo(item) : null);
  }, [item]);

  if (!item || !campos) return null;
  const mudar = (campo: keyof Campos) => (valor: string) =>
    setCampos({ ...campos, [campo]: valor });

  const salvar = async () => {
    const problema = problemaDos(campos);
    if (problema) return showAlert({ type: 'error', title: 'Confira o ajuste', message: problema });
    setSalvando(true);
    const videoGravado = await gravarVideo(item, campos.video, podeEditarVideo);
    setSalvando(false);
    if (!videoGravado) return;
    onSalvar(ajustado(item, campos));
    onFechar();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onFechar}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/60"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          className="rounded-t-3xl border-t border-glass-border bg-background px-4 pt-4"
          style={{ paddingBottom: insets.bottom + escalar(MARGEM_DO_FUNDO) }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text numberOfLines={1} className="flex-1 text-h2 font-bold text-foreground">
              {item.exercise?.name ?? 'Exercício'}
            </Text>
            <BotaoRedondo icone="close" rotulo="Fechar sem ajustar" onPress={onFechar} />
          </View>
          <View className="flex-row gap-2.5">
            <Campo rotulo="Séries" valor={campos.series} onMudar={mudar('series')} numerico />
            <Campo rotulo="Repetições" valor={campos.reps} onMudar={mudar('reps')} />
          </View>
          <View className="mt-2.5 flex-row gap-2.5">
            <Campo rotulo="Carga (kg)" valor={campos.carga} onMudar={mudar('carga')} numerico />
            <Campo
              rotulo="Descanso (s)"
              valor={campos.descanso}
              onMudar={mudar('descanso')}
              numerico
            />
          </View>
          {podeEditarVideo ? (
            <View className="mt-2.5 flex-row">
              <Campo
                rotulo="Vídeo do exercício (URL)"
                valor={campos.video}
                onMudar={mudar('video')}
              />
            </View>
          ) : null}
          <View className="mt-5">
            <BotaoDeDestaque
              rotulo={salvando ? 'Salvando…' : 'Ajustar'}
              icone="checkmark"
              onPress={salvar}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ajustado(item: WorkoutExercise, campos: Campos): WorkoutExercise {
  return {
    ...item,
    sets: Number.parseInt(campos.series, 10),
    reps: campos.reps.trim(),
    weight: campos.carga.trim() || null,
    rest_seconds: Number.parseInt(campos.descanso || '0', 10),
    exercise: item.exercise
      ? { ...item.exercise, video_url: campos.video.trim() || null }
      : undefined,
  };
}

/** Grava o vídeo no catálogo quando mudou. Devolve se pode seguir. */
async function gravarVideo(item: WorkoutExercise, video: string, pode: boolean): Promise<boolean> {
  const novo = video.trim();
  if (!pode || !item.exercise || novo === (item.exercise.video_url ?? '')) return true;
  try {
    await servicoDeTreinos.updateExercise(item.exercise.id, { video_url: novo || null });
    return true;
  } catch {
    showAlert({
      type: 'error',
      title: 'Vídeo não salvo',
      message: 'Não consegui atualizar o vídeo do exercício. Tente de novo.',
    });
    return false;
  }
}

interface CampoProps {
  rotulo: string;
  valor: string;
  onMudar: (valor: string) => void;
  numerico?: boolean;
}

function Campo({ rotulo, valor, onMudar, numerico = false }: CampoProps) {
  const cores = useCores();
  return (
    <Pressable className="flex-1 rounded-md border border-glass-border bg-glass-strong px-3 py-2">
      <Text className="text-[0.65625rem] font-bold uppercase tracking-widest text-placeholder">
        {rotulo}
      </Text>
      <TextInput
        value={valor}
        onChangeText={onMudar}
        keyboardType={numerico ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        placeholderTextColor={cores.placeholder}
        accessibilityLabel={rotulo}
        className="mt-0.5 text-rotulo font-semibold text-foreground"
      />
    </Pressable>
  );
}
