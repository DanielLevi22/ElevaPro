import { formatPse } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { BotaoRedondo } from '@/components/ui/BotaoRedondo';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { Vidro } from '@/components/ui/Vidro';
import { useCores, useEscala } from '@/shared/design';
import { fotoDoGrupo } from '@/shared/imagens/fotosDeTreino';
import { ModalDeFeedback } from '../components/sessao/ModalDeFeedback';
import { useWorkoutLogStore, type WorkoutLog } from '../store/workoutLogStore';

/**
 * O histórico das sessões do próprio aluno, e o caminho para corrigir o que ele
 * declarou — Art. 18, III.
 *
 * A tela existe porque o direito não tinha por onde ser exercido: o aluno
 * apertava "Salvar e finalizar" e o texto ficava como estava para sempre.
 * Ficou grave quando o especialista passou a LER `workout_sessions.notes` no
 * feed de atividades: quem escreveu "senti dor no ombro direito" quando era o
 * esquerdo não tinha como consertar antes de a prescrição ser ajustada para o
 * lado errado.
 *
 * O que a tela NÃO oferece, de propósito: editar data, duração, calorias ou
 * séries. Aquilo é medida do evento, e o remédio para uma medida inexata é
 * medir de novo. A `0036` impõe a mesma fronteira no banco.
 */

function tituloDaSessao(log: WorkoutLog): string {
  if (log.session_type === 'cardio') return log.activity_name ?? 'Cardio';
  return log.workout?.title ?? 'Treino';
}

function dataCurta(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const SEGUNDOS_POR_MINUTO = 60;

/** 374 s/km → "6'14"". */
function comoRitmo(segundosPorKm: number): string {
  const minutos = Math.floor(segundosPorKm / SEGUNDOS_POR_MINUTO);
  const segundos = segundosPorKm % SEGUNDOS_POR_MINUTO;
  return `${minutos}'${segundos < 10 ? '0' : ''}${segundos}"`;
}

/**
 * Resumo de uma linha para a corrida.
 *
 * Distância e ritmo entram aqui e o percurso não entra em lugar nenhum: as
 * coordenadas morrem com a sessão, então esta tela nunca terá o mapa (#278).
 */
function detalheCardio(log: WorkoutLog): string | null {
  if (log.session_type !== 'cardio') return null;
  const partes: string[] = [];
  // Distância primeiro: numa corrida é a medida que responde "como foi", e a
  // duração sozinha não distingue 5 km de 9 km na mesma hora.
  if (log.distance_meters) {
    partes.push(`${(log.distance_meters / 1000).toFixed(2).replace('.', ',')} km`);
  }
  if (log.avg_pace_seconds_per_km) partes.push(`${comoRitmo(log.avg_pace_seconds_per_km)}/km`);
  if (log.duration_seconds) {
    partes.push(`${Math.round(log.duration_seconds / SEGUNDOS_POR_MINUTO)} min`);
  }
  if (log.active_calories) partes.push(`${log.active_calories} kcal`);
  // Ausente para o especialista de quem revogou o consentimento: a RLS de
  // `workout_session_vitals` esvazia a junção, e o resto da linha continua.
  if (log.avg_heart_rate) partes.push(`${log.avg_heart_rate} bpm`);
  return partes.length > 0 ? partes.join(' · ') : null;
}

const TAMANHO_DO_LAPIS = 18;

function LinhaDaSessao({ log, onCorrigir }: { log: WorkoutLog; onCorrigir: () => void }) {
  const cores = useCores();
  const escalar = useEscala();
  const detalhe = detalheCardio(log);
  const partes = [
    dataCurta(log.completed_at ?? log.started_at),
    detalhe,
    log.perceived_exertion === null ? null : `PSE ${formatPse(log.perceived_exertion)}`,
  ].filter(Boolean);

  return (
    <Vidro classeExterna="mb-3" className="flex-row items-start gap-3 p-4">
      <View className="flex-1">
        <Text className="text-base font-bold text-foreground">{tituloDaSessao(log)}</Text>
        <Text className="mt-1 text-micro text-muted-foreground">{partes.join(' · ')}</Text>

        {log.notes ? (
          <Text className="mt-2 border-l-2 border-glass-border pl-2.5 text-sm italic text-foreground">
            “{log.notes}”
          </Text>
        ) : null}

        {/*
          Discreta. Corrigir é o titular usando um direito, não um sinal de
          problema — e ele precisa ver que a marca existe, porque é ela que o
          especialista lê do outro lado.
        */}
        {log.feedback_edited_at ? (
          <Text className="mt-1.5 text-micro text-placeholder">
            corrigido em {dataCurta(log.feedback_edited_at)}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={onCorrigir}
        accessibilityRole="button"
        accessibilityLabel={`Corrigir feedback de ${tituloDaSessao(log)}`}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-glass-strong"
      >
        <Ionicons
          name="create-outline"
          size={escalar(TAMANHO_DO_LAPIS)}
          color={cores.mutedForeground}
        />
      </TouchableOpacity>
    </Vidro>
  );
}

export function SessionHistoryScreen() {
  const router = useRouter();
  const cores = useCores();
  const user = useAuthStore((s) => s.user);
  const { logs, loading, fetchLogs, updateSessionFeedback } = useWorkoutLogStore();

  const [emCorrecao, setEmCorrecao] = useState<WorkoutLog | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    if (user?.id) fetchLogs(user.id);
  }, [user?.id, fetchLogs]);

  const salvarCorrecao = useCallback(
    async (pse: number, notes: string) => {
      const alvo = emCorrecao;
      if (!alvo || !user?.id) return;
      setEmCorrecao(null);
      try {
        await updateSessionFeedback(alvo.id, user.id, { perceived_exertion: pse, notes });
      } catch {
        // Sem o erro: o do PostgREST carrega o payload, e o payload é `notes`.
        showAlert({
          type: 'error',
          title: 'Não deu',
          message: 'Não consegui salvar a correção. Tente de novo.',
        });
      }
    },
    [emCorrecao, user?.id, updateSessionFeedback]
  );

  const apagarObservacao = useCallback(async () => {
    const alvo = confirmandoApagar;
    if (!alvo || !user?.id) return;
    setConfirmandoApagar(null);
    try {
      await updateSessionFeedback(alvo.id, user.id, { notes: null });
    } catch {
      showAlert({
        type: 'error',
        title: 'Não deu',
        message: 'Não consegui apagar a observação. Tente de novo.',
      });
    }
  }, [confirmandoApagar, user?.id, updateSessionFeedback]);

  return (
    <ScreenLayout>
      <View className="mb-2 flex-row items-center gap-4 px-4 py-4">
        <BotaoRedondo icone="chevron-back" rotulo="Voltar" onPress={router.back} />
        <View className="flex-1">
          <Text className="text-h1 font-extrabold text-foreground">Meus treinos</Text>
          <Text className="text-legenda text-muted-foreground">
            Corrija o que você escreveu a qualquer momento
          </Text>
        </View>
      </View>

      {loading && logs.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator color={cores.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(log) => log.id}
          contentContainerClassName="px-4 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => user?.id && fetchLogs(user.id)}
              tintColor={cores.primary}
            />
          }
          ListEmptyComponent={<HistoricoVazio />}
          renderItem={({ item }) => (
            <LinhaDaSessao log={item} onCorrigir={() => setEmCorrecao(item)} />
          )}
        />
      )}

      <ModalDeFeedback
        visivel={emCorrecao !== null}
        modo="correcao"
        imagem={fotoDoGrupo(null)}
        pseInicial={emCorrecao?.perceived_exertion ?? null}
        notasIniciais={emCorrecao?.notes ?? null}
        onFechar={() => setEmCorrecao(null)}
        onSalvar={salvarCorrecao}
        onApagarObservacao={() => {
          const alvo = emCorrecao;
          setEmCorrecao(null);
          setConfirmandoApagar(alvo);
        }}
      />

      {/*
        A confirmação diz o que PERMANECE, não só o que sai. Apagar sem saber o
        que fica é o que produz o pedido de suporte seguinte — e aqui a
        diferença importa de verdade: a observação é a parte consentida
        (Art. 18, VI), a sessão é execução de contrato e continua.
      */}
      <ConfirmModal
        visible={confirmandoApagar !== null}
        type="danger"
        title="Apagar observação?"
        message="A observação some. O treino, a data e as séries continuam no seu histórico."
        confirmText="Apagar observação"
        cancelText="Manter"
        onConfirm={apagarObservacao}
        onClose={() => setConfirmandoApagar(null)}
      />
    </ScreenLayout>
  );
}

const TAMANHO_DO_ICONE_VAZIO = 40;

function HistoricoVazio() {
  const cores = useCores();
  const escalar = useEscala();
  return (
    <View className="items-center px-8 py-16">
      <Ionicons
        name="barbell-outline"
        size={escalar(TAMANHO_DO_ICONE_VAZIO)}
        color={cores.placeholder}
      />
      <Text className="mt-3 text-center text-sm text-muted-foreground">
        Nenhum treino concluído ainda. Depois do primeiro, ele aparece aqui — e você pode corrigir o
        que escreveu.
      </Text>
    </View>
  );
}
