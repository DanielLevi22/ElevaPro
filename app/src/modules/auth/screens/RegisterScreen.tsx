import { createAuthService, type ServiceType } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import type { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

const authService = createAuthService(supabase);

const SENHA_MINIMA = 8;
const NOME_MINIMO = 2;

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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function seguir() {
    if (etapas.impedimento) {
      showAlert({ title: 'Atenção', message: etapas.impedimento, type: 'warning' });
      return;
    }
    etapas.avancar();
  }

  async function cadastrar() {
    const erro = validarDados({ fullName, password, confirmPassword });
    if (erro) {
      showAlert({ title: 'Erro', message: erro, type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await criarConta({
        papel: etapas.papel,
        servicos: etapas.servicos,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace(ROUTES.TABS.ROOT);
    } catch (erro: unknown) {
      showAlert(avisoDoErro(erro));
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
            <Group header="Dados pessoais" footer="A senha deve ter no mínimo 8 caracteres.">
              <Input
                icon="person"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Seu nome"
                autoComplete="name"
              />
              <Input
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Input
                icon="lock-closed"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                senha
                autoComplete="new-password"
              />
              <Input
                icon="lock-closed"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Digite a senha novamente"
                senha
                autoComplete="new-password"
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
                <Button label="Criar Conta" fullWidth isLoading={loading} onPress={cadastrar} />
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

/** Devolve o primeiro impedimento, ou `null` quando os dados servem. */
function validarDados(dados: {
  fullName: string;
  password: string;
  confirmPassword: string;
}): string | null {
  if (dados.fullName.trim().length < NOME_MINIMO) return 'Digite seu nome completo';
  if (dados.password.length < SENHA_MINIMA) {
    return `A senha deve ter no mínimo ${SENHA_MINIMA} caracteres`;
  }
  if (dados.password !== dados.confirmPassword) return 'As senhas não coincidem';
  return null;
}

type DadosDoCadastro = {
  papel: PapelNoCadastro;
  servicos: ServiceType[];
  fullName: string;
  email: string;
  password: string;
};

/**
 * Cada papel tem seu método no serviço, e não um só com um campo de tipo: é o
 * servidor que decide o que cada cadastro pode declarar. O `account_type` vindo
 * do cliente é validado no trigger `handle_new_user` — valor desconhecido cai
 * para `member` em vez de abortar (migration 0040).
 */
async function criarConta(dados: DadosDoCadastro): Promise<void> {
  const comum = {
    email: dados.email,
    password: dados.password,
    full_name: dados.fullName,
  };

  const resposta =
    dados.papel === 'specialist'
      ? await authService.signUpSpecialist({ ...comum, service_types: dados.servicos })
      : dados.papel === 'student'
        ? await authService.signUpStudent(comum)
        : await authService.signUpMember(comum);

  if (resposta.error) throw resposta.error;
  if (!resposta.data.user) throw new Error('Erro ao criar usuário');
}

function avisoDoErro(erro: unknown): Parameters<typeof showAlert>[0] {
  const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido. Tente novamente.';

  if (mensagem.toLowerCase().includes('already registered')) {
    return {
      title: 'E-mail já cadastrado',
      message: 'Este e-mail já possui uma conta. Faça login.',
      type: 'warning',
    };
  }
  return { title: 'Erro no Cadastro', message: mensagem, type: 'error' };
}
