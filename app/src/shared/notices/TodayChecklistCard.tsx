import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { LinhaDeVidro } from '@/components/ui/LinhaDeVidro';
import { TituloDeSecao } from '@/components/ui/TituloDeSecao';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { localDateKey } from '@/services/healthSync';
import { NOTICE_ACTIONS } from '@/services/notificationService';
import { handleNoticeAction } from './noticeActions';
import { type ChecklistItem, TODAY_CHECKLIST_KEY, useTodayChecklist } from './useTodayChecklist';

/**
 * E4 · Falta hoje: o que ficou para trás com o botão de fazer, e embaixo o que
 * já foi feito. É para onde vai o que passou do limite de avisos do dia.
 *
 * @example <TodayChecklistCard studentId={user.id} />
 */
export function TodayChecklistCard({ studentId }: { studentId: string | null }) {
  const { data: items = [] } = useTodayChecklist(studentId);
  const pending = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done);
  if (pending.length === 0) return null;

  return (
    <>
      <TituloDeSecao estilo="rotulo">Falta hoje</TituloDeSecao>
      {pending.map((item) => (
        <PendingRow key={`${item.kind}-${item.id}`} item={item} studentId={studentId ?? ''} />
      ))}
      {done.length > 0 ? (
        <Text className="mt-1 text-[0.71875rem] text-hero-secondary">
          {`Feito hoje: ${done.map((item) => item.name).join(', ')}`}
        </Text>
      ) : null}
    </>
  );
}

function PendingRow({ item, studentId }: { item: ChecklistItem; studentId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function act() {
    if (item.kind === 'workout') {
      router.push(ROUTES.WORKOUTS.EXECUTE(item.id));
      return;
    }
    setSaving(true);
    try {
      const notice = { noticeKind: 'meal' as const, refId: item.id, date: localDateKey() };
      await handleNoticeAction(studentId, NOTICE_ACTIONS.mealDone, notice);
      await queryClient.invalidateQueries({ queryKey: [TODAY_CHECKLIST_KEY] });
    } catch {
      registrarFalha('notices.checklist_mark');
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinhaDeVidro
      icon={item.kind === 'meal' ? 'restaurant-outline' : 'barbell-outline'}
      tom={item.kind === 'meal' ? 'calorias' : 'marca'}
      titulo={item.name}
      sub={item.kind === 'meal' ? `${item.time} · ainda não marcada` : 'Ainda dá tempo hoje'}
      direita={
        <TouchableOpacity
          accessibilityRole="button"
          disabled={saving}
          onPress={act}
          className="rounded-full bg-primary px-3.5 py-2"
        >
          <Text className="text-[0.78125rem] font-bold text-primary-foreground">
            {item.kind === 'meal' ? 'Marcar' : 'Começar'}
          </Text>
        </TouchableOpacity>
      }
    />
  );
}
