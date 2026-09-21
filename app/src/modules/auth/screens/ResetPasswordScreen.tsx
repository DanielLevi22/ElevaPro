import { PASSWORD_REQUIREMENTS_HINT, passwordValidationError } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Hero } from '@/components/ui/Hero';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ROUTES } from '@/navigation/types';
import { useAuthStore } from '../store/authStore';

/**
 * Destino de `elevapro://reset-password` — o link de convite e de recuperação
 * de senha (ADR-0035). A sessão já existe quando esta tela abre: o Supabase a
 * troca antes de o link chegar aqui. Falta só a senha.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const completeAccountInvite = useAuthStore((state) => state.completeAccountInvite);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (password !== confirmPassword) {
      showAlert({ title: 'Erro', message: 'As senhas não são iguais.', type: 'error' });
      return;
    }

    const passwordError = passwordValidationError(password);
    if (passwordError) {
      showAlert({ title: 'Erro', message: passwordError, type: 'error' });
      return;
    }

    setLoading(true);
    const result = await completeAccountInvite(password);
    setLoading(false);

    if (result.success) {
      showAlert({
        title: 'Senha definida',
        message: 'Sua conta está pronta.',
        type: 'success',
        buttonText: 'Continuar',
        onDismiss: () => router.replace(ROUTES.TABS.ROOT),
      });
    } else {
      showAlert({
        title: 'Não foi possível definir a senha',
        message: result.error || 'O link pode ter expirado — peça um novo.',
        type: 'error',
      });
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
          imagem={require('../../../../assets/workouts/legs.jpg')}
          titulo="Defina sua senha"
          sub="Só você vai conhecer essa senha — nem o seu especialista."
        />

        <View className="flex-1 justify-center px-5">
          <Group footer={PASSWORD_REQUIREMENTS_HINT}>
            <Input
              icon="lock-closed"
              value={password}
              onChangeText={setPassword}
              placeholder="Nova senha"
              senha
              autoComplete="new-password"
            />
            <Input
              icon="lock-closed"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirme a nova senha"
              senha
              autoComplete="new-password"
            />
          </Group>

          <Button label="Confirmar" onPress={handleConfirm} isLoading={loading} fullWidth />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
