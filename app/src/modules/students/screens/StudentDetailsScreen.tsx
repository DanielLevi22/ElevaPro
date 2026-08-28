import { Ionicons } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { QuickActions } from '@/components/workout/QuickActions';
import { ROUTES } from '@/navigation/types';
import { useStudentStore } from '../store/studentStore';

export default function StudentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { students, fetchStudents, isLoading } = useStudentStore();
  const { user } = useAuthStore();
  const [student, setStudent] = useState<import('../store/studentStore').Student | null>(null);
  const [hasTriedFetch, setHasTriedFetch] = useState(false);

  const studentId = Array.isArray(id) ? id[0] : id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    if (!studentId) return;

    const found = students.find((s) => s.id === studentId);

    if (found) {
      setStudent(found);
    } else if (user?.id && !isLoading && !hasTriedFetch) {
      // If student not found locally and haven't tried fetching yet, force a refresh
      setHasTriedFetch(true);
      fetchStudents(user.id);
    }
  }, [students, studentId, user, isLoading, hasTriedFetch]);

  if (isLoading && !student) {
    return (
      <ScreenLayout className="justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </ScreenLayout>
    );
  }

  if (!student) {
    return (
      <ScreenLayout className="justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#52525B" />
        <Text className="text-white text-lg font-bold mt-4 font-display text-center">
          Aluno não encontrado
        </Text>
        <Text className="text-zinc-500 text-center mt-2 mb-8">
          Não foi possível carregar os dados deste aluno. Ele pode ter sido removido ou você não tem
          acesso.
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl flex-row items-center"
          onPress={() => {
            setHasTriedFetch(false);
            if (user?.id) fetchStudents(user.id);
          }}
        >
          <Ionicons name="refresh-outline" size={20} color="white" />
          <Text className="text-white font-bold ml-2">Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-6" onPress={() => router.back()}>
          <Text className="text-zinc-400">Voltar</Text>
        </TouchableOpacity>
      </ScreenLayout>
    );
  }

  // `route: Href` em vez de `string`: sem a anotação o array vira `string`
  // largo, o `typedRoutes` recusa o navigate e o `as never` voltava a esconder
  // destino inexistente.
  const menuItems: {
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    gradient: string[];
    route: Href;
    disabled?: boolean;
  }[] = [
    {
      title: 'Treinos',
      subtitle: 'Gerenciar fichas',
      icon: 'barbell-outline',
      color: '#FF6B35',
      gradient: ['#FF6B35', '#FF2E63'],
      route: ROUTES.STUDENTS.WORKOUTS(id as string),
    },
    {
      title: 'Dieta',
      subtitle: 'Plano alimentar',
      icon: 'restaurant-outline',
      color: '#00D9FF',
      gradient: ['#00D9FF', '#00B8D9'],
      route: ROUTES.STUDENTS.NUTRITION(id as string),
    },
    {
      title: 'Histórico',
      subtitle: 'Evolução e logs',
      icon: 'time-outline',
      color: '#00C9A7',
      gradient: ['#00C9A7', '#00A88E'],
      route: ROUTES.STUDENTS.HISTORY(id as string),
    },
    {
      title: 'Avaliação',
      subtitle: 'Medidas e fotos',
      icon: 'body-outline',
      color: '#FFB800',
      gradient: ['#FFB800', '#FF9500'],
      route: ROUTES.STUDENTS.ASSESSMENT(id as string),
      disabled: false,
    },
    {
      title: 'Anamnese',
      subtitle: 'Questionário',
      icon: 'document-text-outline',
      color: '#A855F7', // Purple
      gradient: ['#A855F7', '#C084FC'],
      route: `/students/anamnesis?studentId=${Array.isArray(id) ? id[0] : id}`,
      disabled: false,
    },
  ];

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="items-center pt-8 pb-8 px-6 bg-zinc-900 rounded-b-[32px] border-b border-zinc-800 relative">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-8 left-6 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center z-10"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          <View className="w-24 h-24 rounded-full bg-cyan-400/10 items-center justify-center mb-4 border-2 border-cyan-400/20">
            <Ionicons name="person" size={48} color="#00D9FF" />
          </View>

          <Text className="text-2xl font-extrabold text-white mb-1 font-display text-center">
            {student.full_name}
          </Text>
          <Text className="text-zinc-400 font-sans mb-6">{student.email}</Text>

          {/* Quick Stats */}
          <View className="flex-row gap-4 w-full">
            <View className="flex-1 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 items-center">
              <Text className="text-zinc-500 text-xs font-bold mb-1 uppercase tracking-wider">
                Status
              </Text>
              <Text
                className={`text-base font-bold ${student.account_status === 'active' ? 'text-emerald-400' : 'text-orange-500'}`}
              >
                {student.account_status === 'active' ? 'Ativo' : 'Pendente'}
              </Text>
            </View>
            <View className="flex-1 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 items-center">
              <Text className="text-zinc-500 text-xs font-bold mb-1 uppercase tracking-wider">
                Desde
              </Text>
              <Text className="text-white text-base font-bold">
                {student.link_created_at
                  ? new Date(student.link_created_at).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Row */}
        <View className="mt-6 mb-2">
          <QuickActions
            onDownload={() =>
              showAlert({
                title: 'Em breve',
                message: 'Geração de PDF da ficha completa',
                type: 'info',
              })
            }
            onStudentView={async () => {
              const { enterStudentView } = useAuthStore.getState();
              await enterStudentView({
                id: student.id,
                email: student.email,
                full_name: student.full_name ?? '',
              });
              // Small delay to ensure state propagates before navigation
              setTimeout(() => {
                router.replace(ROUTES.TABS.ROOT);
              }, 100);
            }}
            onEvolution={() => router.navigate(ROUTES.STUDENTS.ANALYTICS(id as string))}
          />
        </View>

        {/* Menu Grid */}
        <View className="p-6 pt-0">
          <Text className="text-white text-lg font-bold mb-4 font-display tracking-wide">
            GERENCIAMENTO
          </Text>

          <View className="flex-row flex-wrap gap-4">
            {menuItems.map((item, _index) => {
              return (
                <TouchableOpacity
                  key={item.title}
                  className={`w-[47%] h-40 rounded-3xl p-4 justify-between border ${item.disabled ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-900 border-zinc-800'}`}
                  onPress={() => !item.disabled && router.navigate(item.route)}
                  activeOpacity={item.disabled ? 1 : 0.7}
                >
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: item.disabled ? '#27272A' : `${item.color}20` }}
                  >
                    <Ionicons
                      name={item.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={item.disabled ? '#52525B' : item.color}
                    />
                  </View>

                  <View>
                    <Text
                      className={`text-base font-bold mb-1 font-display ${item.disabled ? 'text-zinc-600' : 'text-white'}`}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-zinc-500 text-xs font-sans">{item.subtitle}</Text>
                  </View>

                  {!item.disabled && (
                    <View className="absolute top-4 right-4">
                      <Ionicons name="arrow-forward" size={16} color={item.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Danger Zone */}
        <View className="px-6 mt-4">
          <TouchableOpacity
            className="flex-row items-center justify-center p-4 rounded-2xl border border-red-500/20 bg-red-500/5"
            onPress={() => {
              showAlert({
                title: 'Em breve',
                message: 'Funcionalidade de arquivar aluno em desenvolvimento',
                type: 'info',
              });
            }}
          >
            <Ionicons name="archive-outline" size={20} color="#FF4444" />
            <Text className="text-red-500 font-bold ml-2">Arquivar Aluno</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
