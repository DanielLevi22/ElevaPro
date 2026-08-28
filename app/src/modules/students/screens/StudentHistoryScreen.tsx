import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useStudentStore } from '../store/studentStore';

type EventType = 'assessment' | 'diet';

interface HistoryEvent {
  id: string;
  type: EventType;
  title: string;
  date: string;
  subtitle?: string;
}

async function fetchStudentHistory(
  studentId: string,
  specialistId: string
): Promise<HistoryEvent[]> {
  const [assessmentsResult, dietPlansResult] = await Promise.all([
    supabase
      .from('physical_assessments')
      .select('id, assessed_at, weight_kg')
      .eq('student_id', studentId)
      .eq('specialist_id', specialistId)
      .order('assessed_at', { ascending: false })
      .limit(20),

    supabase
      .from('diet_plans')
      .select('id, created_at, name, status')
      .eq('student_id', studentId)
      .eq('specialist_id', specialistId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const events: HistoryEvent[] = [];

  for (const a of assessmentsResult.data ?? []) {
    const parts: string[] = [];
    if (a.weight_kg) parts.push(`${a.weight_kg} kg`);
    events.push({
      id: `assessment-${a.id}`,
      type: 'assessment',
      title: 'Avaliação Física',
      date: a.assessed_at,
      subtitle: parts.join(' · ') || undefined,
    });
  }

  for (const d of dietPlansResult.data ?? []) {
    events.push({
      id: `diet-${d.id}`,
      type: 'diet',
      title: d.name ?? 'Plano alimentar',
      date: d.created_at,
      // `diet_plan_status` é `active | finished`; 'inactive' nunca casava.
      subtitle: d.status === 'active' ? 'Ativo' : d.status === 'finished' ? 'Concluído' : undefined,
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function EventIcon({ type }: { type: EventType }) {
  const name = type === 'diet' ? 'restaurant' : 'body';
  const color = type === 'diet' ? '#10B981' : '#A1A1AA';
  return <Ionicons name={name} size={16} color={color} style={{ marginRight: 8 }} />;
}

function EventLabel({ type }: { type: EventType }) {
  return type === 'diet' ? 'Dieta' : 'Avaliação';
}

function dotColor(type: EventType) {
  return type === 'diet' ? 'bg-emerald-500' : 'bg-zinc-500';
}

export default function StudentHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { students, fetchStudents, isLoading: studentsLoading } = useStudentStore();
  const { user } = useAuthStore();

  const [student, setStudent] = useState<
    import('../store/studentStore').Student | null | undefined
  >(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    if (user?.id && !students.length) {
      fetchStudents(user.id);
    }
  }, [user, fetchStudents]);

  useEffect(() => {
    if (students.length > 0 && id) {
      const found = students.find((s) => s.id === id);
      setStudent(found);
    }
  }, [students, id]);

  useEffect(() => {
    if (!id || !user?.id) return;

    setHistoryLoading(true);
    setHistoryError(false);

    fetchStudentHistory(id as string, user.id)
      .then(setEvents)
      .catch(() => setHistoryError(true))
      .finally(() => setHistoryLoading(false));
  }, [id, user?.id]);

  if (studentsLoading || !student) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#CCFF00" />
      </ScreenLayout>
    );
  }

  const renderItem = ({ item }: { item: HistoryEvent }) => (
    <View className="flex-row mb-6">
      {/* Timeline dot */}
      <View className="items-center mr-4">
        <View className={`w-3 h-3 rounded-full ${dotColor(item.type)}`} />
        <View className="w-0.5 flex-1 bg-zinc-800 my-1" />
      </View>

      {/* Card */}
      <View className="flex-1 bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center">
            <EventIcon type={item.type} />
            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
              <EventLabel type={item.type} />
            </Text>
          </View>
          <Text className="text-zinc-500 text-xs">
            {new Date(item.date).toLocaleDateString('pt-BR')}
          </Text>
        </View>

        <Text className="text-white text-base font-bold mb-1">{item.title}</Text>

        {item.subtitle && <Text className="text-zinc-400 text-xs mt-1">{item.subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-extrabold text-white font-display">Histórico</Text>
          <Text className="text-zinc-400 font-sans">{student.full_name}</Text>
        </View>
      </View>

      {historyLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#CCFF00" />
        </View>
      )}

      {historyError && !historyLoading && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-zinc-500 text-center">Erro ao carregar histórico.</Text>
        </View>
      )}

      {!historyLoading && !historyError && (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-10">
              <Text className="text-zinc-500 font-sans">Nenhum histórico encontrado.</Text>
            </View>
          }
        />
      )}
    </ScreenLayout>
  );
}
