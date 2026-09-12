import { supabase } from '@elevapro/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { type ChipDoHero, Hero } from '@/components/ui/Hero';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ROUTES } from '@/navigation/types';
import { useAuthStore } from '../store/authStore';

/**
 * Os quatro pilares do produto, como o hero desenhado os apresenta.
 *
 * O desenho rotula o quarto como "Coach IA". Aqui é **Assistente**, porque o
 * `CONTEXT.md` lista "Coach IA" entre os termos a evitar: "Coach" já é o que o
 * Specialist é para o Student, e usar a mesma palavra para a máquina apaga a
 * distinção exatamente onde ela importa — quem responde pela prescrição.
 */
const PILARES: ChipDoHero[] = [
  { icon: 'barbell', label: 'Treino' },
  { icon: 'restaurant', label: 'Nutrição' },
  { icon: 'fitness', label: 'Saúde' },
  { icon: 'sparkles', label: 'Assistente' },
];

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthStore();
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    const result = await signIn(email, password);

    if (!result.success) {
      showAlert({
        title: 'Erro no Login',
        message: result.error || 'Erro desconhecido',
        type: 'error',
      });
    } else {
      await barrarContaDesativada();
    }
    setLoading(false);
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
          titulo={'Eleva seu nível.\nAcompanhamento que não para.'}
          sub="Treino, nutrição e saúde no mesmo app."
          chips={PILARES}
        />

        <View className="flex-1 px-5">
          <Group>
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
              placeholder="••••••••"
              senha
              autoComplete="current-password"
            />
          </Group>

          <View className="gap-2.5">
            <Button label="Entrar" onPress={handleLogin} isLoading={loading} fullWidth />
            <Button
              label="Esqueci minha senha"
              variant="ghost"
              fullWidth
              onPress={() => router.push(ROUTES.AUTH.FORGOT_PASSWORD)}
            />
          </View>

          <View className="flex-1" />

          <View className="flex-row items-center justify-center pb-7 pt-6">
            <Text className="text-rotulo tracking-tight text-muted-foreground">
              Personal Trainer?{' '}
            </Text>
            <TouchableOpacity
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.AUTH.REGISTER)}
            >
              <Text className="text-rotulo font-bold tracking-tight text-primary-text">
                Cadastre-se grátis
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

/**
 * Conta desativada entra e sai na mesma ação.
 *
 * O enum `account_status` do banco é `active | inactive | invited`. Aqui se
 * comparava com 'rejected' e 'suspended', que nunca existiram: o ramo jamais
 * executava e conta desativada entrava normalmente.
 *
 * `invited` não barra mais ninguém. Ele barrava duas pessoas de uma vez: o
 * especialista na fila de aprovação, que deixou de existir na 0050, e o aluno
 * provisionado pelo Specialist — que nasce `invited` no Fluxo A e era mandado
 * para a tela de aprovação na primeira vez que tentava entrar. Esse aluno nunca
 * conseguiu acessar o app.
 */
async function barrarContaDesativada(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_status')
    .eq('id', user.id)
    .single();

  if (profile?.account_status !== 'inactive') return;

  await supabase.auth.signOut();
  showAlert({
    title: 'Acesso Negado',
    message: 'Sua conta foi suspensa ou rejeitada. Entre em contato com o suporte.',
    type: 'error',
  });
}
