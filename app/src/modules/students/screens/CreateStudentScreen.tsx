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
import { useCadastroDeAluno } from '../hooks/useCadastroDeAluno';
import { useStudentStore } from '../store/studentStore';

type OpcaoDeServico = { valor: ServiceType; icon: keyof typeof Ionicons.glyphMap; titulo: string };

/** Mesmos rótulos do cadastro do especialista — o mesmo enum, o mesmo nome. */
const SERVICOS: OpcaoDeServico[] = [
  { valor: 'personal_training', icon: 'barbell', titulo: 'Treino' },
  { valor: 'nutrition_consulting', icon: 'restaurant', titulo: 'Nutrição' },
];

export default function CreateStudentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myServiceTypes, fetchMyServiceTypes, createStudent } = useStudentStore();
  const [isLoading, setIsLoading] = useState(false);
  const cadastro = useCadastroDeAluno({ servicosOferecidos: myServiceTypes });

  // biome-ignore lint/correctness/useExhaustiveDependencies: só na entrada da tela
  useEffect(() => {
    if (user?.id) fetchMyServiceTypes(user.id);
  }, [user?.id]);

  async function enviarConvite() {
    if (cadastro.impedimento || !user?.id) return;

    setIsLoading(true);
    const resultado = await createStudent({
      specialist_id: user.id,
      full_name: cadastro.fullName,
      email: cadastro.email.trim(),
      service_types: cadastro.serviceTypes,
    });
    setIsLoading(false);

    if (resultado.success && resultado.studentId) {
      cadastro.concluirConvite(resultado.studentId);
    } else {
      showAlert({
        title: 'Não foi possível enviar o convite',
        message: resultado.error || 'Tente novamente.',
        type: 'error',
      });
    }
  }

  if (cadastro.etapa === 'convite' && cadastro.studentId) {
    return (
      <ConviteEnviado
        email={cadastro.email}
        onAvaliar={() => router.replace(ROUTES.STUDENTS.ASSESSMENT(cadastro.studentId as string))}
        onVoltar={() => router.replace(ROUTES.STUDENTS.ROOT)}
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
              value={cadastro.fullName}
              onChangeText={cadastro.setFullName}
              placeholder="Nome completo"
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              icon="mail"
              value={cadastro.email}
              onChangeText={cadastro.setEmail}
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
            {SERVICOS.filter((opcao) => myServiceTypes.includes(opcao.valor)).map((opcao) => (
              <Row
                key={opcao.valor}
                icon={opcao.icon}
                title={opcao.titulo}
                selected={cadastro.serviceTypes.includes(opcao.valor)}
                onPress={() => cadastro.alternarServico(opcao.valor)}
              />
            ))}
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
            disabled={!!cadastro.impedimento}
            onPress={enviarConvite}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function ConviteEnviado({
  email,
  onAvaliar,
  onVoltar,
}: {
  email: string;
  onAvaliar: () => void;
  onVoltar: () => void;
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

        <Button label="Fazer avaliação física agora" fullWidth onPress={onAvaliar} />
        <View className="h-2.5" />
        <Button label="Voltar para Alunos" variant="tinted" fullWidth onPress={onVoltar} />
      </View>
    </ScreenLayout>
  );
}
