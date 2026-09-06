import { formatRpe, rpeLabelComEmoji } from '@elevapro/shared';
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
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { WorkoutFeedbackModal } from '@/components/workout/WorkoutFeedbackModal';
import { useWorkoutLogStore, type WorkoutLog } from '../store/workoutLogStore';

/**
 * O histórico das sessões do próprio aluno, e o caminho para corrigir o que ele
 * escreveu — Art. 18, III.
 *
 * A tela existe porque o direito não tinha por onde ser exercido: o aluno
 * apertava "Salvar e Finalizar" e o texto ficava como estava para sempre.
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

/** 374 s/km → "6'14"". */
function comoRitmo(segundosPorKm: number): string {
  const minutos = Math.floor(segundosPorKm / 60);
  const segundos = segundosPorKm % 60;
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
  if (log.duration_seconds) partes.push(`${Math.round(log.duration_seconds / 60)} min`);
  if (log.active_calories) partes.push(`${log.active_calories} kcal`);
  // Ausente para o especialista de quem revogou o consentimento: a RLS de
  // `workout_session_vitals` esvazia a junção, e o resto da linha continua.
  if (log.avg_heart_rate) partes.push(`${log.avg_heart_rate} bpm`);
  return partes.length > 0 ? partes.join(' · ') : null;
}

function LinhaDaSessao({ log, onCorrigir }: { log: WorkoutLog; onCorrigir: () => void }) {
  const detalhe = detalheCardio(log);

  return (
    <View className="bg-zinc-900 rounded-2xl p-4 mb-3 border border-zinc-800">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-white font-bold text-base font-display">{tituloDaSessao(log)}</Text>

          <View className="flex-row items-center flex-wrap gap-x-2 mt-1">
            <Text className="text-zinc-500 text-xs">
              {dataCurta(log.completed_at ?? log.started_at)}
            </Text>
            {detalhe && <Text className="text-zinc-500 text-xs">· {detalhe}</Text>}
            {log.intensity !== null && (
              <Text className="text-zinc-400 text-xs">
                · RPE {formatRpe(log.intensity)} {rpeLabelComEmoji(log.intensity)}
              </Text>
            )}
          </View>

          {log.notes && (
            <Text className="text-zinc-300 text-sm italic mt-2 border-l-2 border-zinc-700 pl-2.5">
              “{log.notes}”
            </Text>
          )}

          {/*
            Discreta. Corrigir é o titular usando um direito, não um sinal de
            problema — e ele precisa ver que a marca existe, porque é ela que o
            especialista lê do outro lado.
          */}
          {log.feedback_edited_at && (
            <Text className="text-zinc-600 text-xs mt-1.5">
              corrigido em {dataCurta(log.feedback_edited_at)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onCorrigir}
          accessibilityRole="button"
          accessibilityLabel={`Corrigir feedback de ${tituloDaSessao(log)}`}
          hitSlop={8}
          className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
        >
          <Ionicons name="create-outline" size={18} color="#A1A1AA" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SessionHistoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logs, loading, fetchLogs, updateSessionFeedback } = useWorkoutLogStore();

  const [emCorrecao, setEmCorrecao] = useState<WorkoutLog | null>(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    if (user?.id) fetchLogs(user.id);
  }, [user?.id, fetchLogs]);

  const salvarCorrecao = useCallback(
    async (intensity: number, notes: string) => {
      const alvo = emCorrecao;
      if (!alvo || !user?.id) return;
      setEmCorrecao(null);
      try {
        await updateSessionFeedback(alvo.id, user.id, { intensity, notes });
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
      <View className="flex-row items-center px-6 py-4 mb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-white font-display">Meus treinos</Text>
          <Text className="text-zinc-400 text-sm font-sans">
            Corrija o que você escreveu a qualquer momento
          </Text>
        </View>
      </View>

      {loading && logs.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator color="#FF4D5A" />
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
              tintColor="#FF4D5A"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-16 px-8">
              <Ionicons name="barbell-outline" size={40} color="#3F3F46" />
              <Text className="text-zinc-500 text-center text-sm mt-3">
                Nenhum treino concluído ainda. Depois do primeiro, ele aparece aqui — e você pode
                corrigir o que escreveu.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <LinhaDaSessao log={item} onCorrigir={() => setEmCorrecao(item)} />
          )}
        />
      )}

      <WorkoutFeedbackModal
        visible={emCorrecao !== null}
        mode="correcao"
        initialIntensity={emCorrecao?.intensity ?? null}
        initialNotes={emCorrecao?.notes ?? null}
        onClose={() => setEmCorrecao(null)}
        onSubmit={salvarCorrecao}
        onDeleteNotes={() => {
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
