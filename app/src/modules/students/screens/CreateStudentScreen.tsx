import type { ServiceType } from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Hero } from '@/components/ui/Hero';
import { Input } from '@/components/ui/Input';
import { Row } from '@/components/ui/Row';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ROUTES } from '@/navigation/types';
import { useStudentRegistration } from '../hooks/useStudentRegistration';
import { useStudentStore } from '../store/studentStore';

type ServiceOption = { value: ServiceType; icon: keyof typeof Ionicons.glyphMap; label: string };

/** Mesmos rótulos do cadastro do especialista — o mesmo enum, o mesmo nome. */
const SERVICE_OPTIONS: ServiceOption[] = [
  { value: 'personal_training', icon: 'barbell', label: 'Treino' },
  { value: 'nutrition_consulting', icon: 'restaurant', label: 'Nutrição' },
];

export default function CreateStudentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myServiceTypes, fetchMyServiceTypes, createStudent } = useStudentStore();
  const [isLoading, setIsLoading] = useState(false);
  const registration = useStudentRegistration({ offeredServices: myServiceTypes });

  // biome-ignore lint/correctness/useExhaustiveDependencies: só na entrada da tela
  useEffect(() => {
    if (user?.id) fetchMyServiceTypes(user.id);
  }, [user?.id]);

  async function handleSendInvite() {
    if (registration.blockingReason || !user?.id) return;

    setIsLoading(true);
    const result = await createStudent({
      specialist_id: user.id,
      full_name: registration.fullName,
      email: registration.email.trim(),
      service_types: registration.serviceTypes,
    });
    setIsLoading(false);

    if (result.success && result.studentId) {
      registration.completeInvite(result.studentId);
    } else {
      showAlert({
        title: 'Não foi possível enviar o convite',
        message: result.error || 'Tente novamente.',
        type: 'error',
      });
    }
  }

  if (registration.step === 'invite' && registration.studentId) {
    return (
      <InviteSent
        email={registration.email}
        onAssess={() =>
          router.replace(ROUTES.STUDENTS.ASSESSMENT(registration.studentId as string))
        }
        onBack={() => router.replace(ROUTES.STUDENTS.ROOT)}
      />
    );
  }

  return (
    <ScreenLayout useSafeArea={false}>
      <ScrollView
        contentContainerClassName="grow pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Hero
          imagem={require('../../../../assets/workouts/back.jpg')}
          titulo="Novo Aluno"
          sub="O aluno recebe um convite por e-mail e define a própria senha."
        />

        <View className="flex-1 justify-center px-5">
          <Group header="Dados básicos">
            <Input
              icon="person"
              value={registration.fullName}
              onChangeText={registration.setFullName}
              placeholder="Nome completo"
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              icon="mail"
              value={registration.email}
              onChangeText={registration.setEmail}
              placeholder="E-mail do aluno"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </Group>

          <Group
            header="Tipo de acompanhamento"
            footer="Só aparecem os serviços que você presta — configure em seu perfil para oferecer outro."
          >
            {SERVICE_OPTIONS.filter((option) => myServiceTypes.includes(option.value)).map(
              (option) => (
                <Row
                  key={option.value}
                  icon={option.icon}
                  title={option.label}
                  selected={registration.serviceTypes.includes(option.value)}
                  onPress={() => registration.toggleService(option.value)}
                />
              )
            )}
            {myServiceTypes.length === 0 ? (
              <View className="px-4 py-3">
                <Text className="text-rotulo text-muted-foreground">
                  Nenhum serviço configurado no seu perfil ainda.
                </Text>
              </View>
            ) : null}
          </Group>

          <Button
            label="Enviar convite"
            fullWidth
            isLoading={isLoading}
            disabled={!!registration.blockingReason}
            onPress={handleSendInvite}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function InviteSent({
  email,
  onAssess,
  onBack,
}: {
  email: string;
  onAssess: () => void;
  onBack: () => void;
}) {
  return (
    <ScreenLayout>
      <View className="flex-1 justify-center px-5">
        <Group header="Convite enviado">
          <View className="items-center px-4 py-6">
            <Text className="text-center text-display font-bold text-foreground">
              Convite enviado
            </Text>
            <Text className="mt-2 text-center text-corpo leading-[1.4] text-muted-foreground">
              {email} recebeu o acesso. O aluno entra como aluno gerenciado e define a própria senha
              — sem custo para ele.
            </Text>
          </View>
        </Group>

        <Button label="Fazer avaliação física agora" fullWidth onPress={onAssess} />
        <View className="h-2.5" />
        <Button label="Voltar para Alunos" variant="tinted" fullWidth onPress={onBack} />
      </View>
    </ScreenLayout>
  );
}
