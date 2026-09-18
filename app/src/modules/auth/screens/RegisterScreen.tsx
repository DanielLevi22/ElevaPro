import {
  PASSWORD_REQUIREMENTS_HINT,
  type RegistrationCredentials,
  registrationCredentialsSchema,
  type ServiceType,
  userFacingAuthError,
} from '@elevapro/shared';
import type { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Hero } from '@/components/ui/Hero';
import { Input } from '@/components/ui/Input';
import { Row } from '@/components/ui/Row';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/navigation/types';
import {
  type Etapa,
  type PapelNoCadastro,
  TOTAL_DE_TRACOS,
  useEtapasDoCadastro,
} from '../hooks/useEtapasDoCadastro';
import { useAuthStore } from '../store/authStore';

/** Identidade estável por traço, para a barra não se remontar a cada etapa. */
const TRACOS = Array.from({ length: TOTAL_DE_TRACOS }, (_, i) => `traco-${i + 1}`);

type Opcao<T> = {
  valor: T;
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  sub: string;
};

/** Os rótulos são os do desenho, e batem com o enum `account_type`. */
const PAPEIS: Opcao<PapelNoCadastro>[] = [
  {
    valor: 'specialist',
    icon: 'barbell',
    titulo: 'Sou Especialista',
    sub: 'Personal trainer ou nutricionista',
  },
  {
    valor: 'student',
    icon: 'flash',
    titulo: 'Sou Aluno',
    sub: 'Treino com personal trainer dedicado',
  },
  {
    valor: 'member',
    icon: 'person',
    titulo: 'Sou Membro',
    sub: 'Crie seus próprios treinos e dietas',
  },
];

const SERVICOS: Opcao<ServiceType>[] = [
  {
    valor: 'personal_training',
    icon: 'barbell',
    titulo: 'Personal Training',
    sub: 'Montagem e acompanhamento de treinos',
  },
  {
    valor: 'nutrition_consulting',
    icon: 'restaurant',
    titulo: 'Consultoria Nutricional',
    sub: 'Planos alimentares e macros',
  },
];

const SUBTITULO: Record<Etapa, string> = {
  papel: 'Como você vai usar o Eleva Pro?',
  servicos: 'Quais serviços você oferece?',
  dados: 'Complete seu cadastro',
};

export function RegisterScreen() {
  const router = useRouter();
  const etapas = useEtapasDoCadastro();
  const signUp = useAuthStore((state) => state.signUp);
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationCredentials>({
    resolver: zodResolver(registrationCredentialsSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  function seguir() {
    if (etapas.impedimento) {
      showAlert({ title: 'Atenção', message: etapas.impedimento, type: 'warning' });
      return;
    }
    etapas.avancar();
  }

  async function cadastrar(dados: RegistrationCredentials) {
    setLoading(true);
    try {
      const result = await signUp(dados.email.toLowerCase(), dados.password, etapas.papel, {
        full_name: dados.fullName,
        service_types: etapas.servicos,
      });
      if (!result.success) throw new Error(result.error ?? 'Não foi possível criar a conta.');
      router.replace(ROUTES.TABS.ROOT);
    } catch (erro: unknown) {
      showAlert({
        title: 'Erro no Cadastro',
        message: userFacingAuthError(erro),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenLayout useSafeArea={false}>
      <ScrollView
        contentContainerClassName="grow pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Hero
          imagem={require('../../../../assets/workouts/chest.jpg')}
          titulo="Criar Conta"
          sub={SUBTITULO[etapas.etapa]}
        />

        <View className="flex-1 justify-center px-5">
          <View className="mb-5 flex-row gap-1.5">
            {TRACOS.map((traco, i) => (
              <View
                key={traco}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i <= etapas.indiceDoTraco ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </View>

          {etapas.etapa === 'papel' ? (
            <Group header="Tipo de conta">
              {PAPEIS.map((opcao) => (
                <Row
                  key={opcao.valor}
                  icon={opcao.icon}
                  title={opcao.titulo}
                  sub={opcao.sub}
                  selected={etapas.papel === opcao.valor}
                  onPress={() => etapas.escolherPapel(opcao.valor)}
                />
              ))}
            </Group>
          ) : null}

          {etapas.etapa === 'servicos' ? (
            <Group header="Serviços" footer="Selecione um ou mais serviços (pode alterar depois).">
              {SERVICOS.map((opcao) => (
                <Row
                  key={opcao.valor}
                  icon={opcao.icon}
                  title={opcao.titulo}
                  sub={opcao.sub}
                  selected={etapas.servicos.includes(opcao.valor)}
                  onPress={() => etapas.alternarServico(opcao.valor)}
                />
              ))}
            </Group>
          ) : null}

          {etapas.etapa === 'dados' ? (
            <Group header="Dados pessoais" footer={PASSWORD_REQUIREMENTS_HINT}>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    icon="person"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Seu nome"
                    autoComplete="name"
                    error={errors.fullName?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    icon="mail"
                    value={value}
                    onChangeText={onChange}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    icon="lock-closed"
                    value={value}
                    onChangeText={onChange}
                    placeholder={PASSWORD_REQUIREMENTS_HINT}
                    senha
                    autoComplete="new-password"
                    error={errors.password?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    icon="lock-closed"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Digite a senha novamente"
                    senha
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </Group>
          ) : null}

          <View className="flex-row gap-2.5">
            {etapas.ehPrimeira ? null : (
              <View className="flex-1">
                <Button label="Voltar" variant="tinted" fullWidth onPress={etapas.voltar} />
              </View>
            )}
            <View className="flex-1">
              {etapas.ehUltima ? (
                <Button
                  label="Criar Conta"
                  fullWidth
                  isLoading={loading}
                  onPress={handleSubmit(cadastrar)}
                />
              ) : (
                <Button label="Continuar" fullWidth onPress={seguir} />
              )}
            </View>
          </View>
        </View>

        {/* Fora do bloco centralizado, como no login: junto, `justify-center`
            levaria este convite para o meio da tela. */}
        <View className="flex-row items-center justify-center px-5 pt-6">
          <Text className="text-rotulo tracking-tight text-muted-foreground">
            Já tem uma conta?{' '}
          </Text>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => router.replace(ROUTES.AUTH.LOGIN)}
          >
            <Text className="text-rotulo font-bold tracking-tight text-primary-text">
              Faça login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
