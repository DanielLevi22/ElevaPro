import { supabase } from '@elevapro/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Group } from '@/components/ui/Group';
import { Hero } from '@/components/ui/Hero';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

/**
 * Recuperação de senha.
 *
 * O desenho do kit não cobre esta tela. Ela é derivada do mesmo padrão das
 * outras duas — hero, um `Group` com um campo, e as ações abaixo —, que é
 * recombinação de padrão existente e não pede desenho novo (regra acordada na
 * #281).
 */
export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const router = useRouter();

  async function enviarLink() {
    if (!email.trim()) {
      showAlert({ title: 'Erro', message: 'Por favor, insira seu e-mail.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // O esquema é declarado em app.json como `elevapro`. Enquanto isto
        // apontava para `meupersonal://`, o link do e-mail não voltava para o
        // app — a recuperação de senha terminava em lugar nenhum.
        redirectTo: 'elevapro://reset-password',
      });
      if (error) throw error;

      setEnviado(true);
      showAlert({
        title: 'E-mail enviado!',
        message: 'Verifique sua caixa de entrada para redefinir sua senha.',
        type: 'success',
        buttonText: 'OK',
        onDismiss: () => router.back(),
      });
    } catch (erro: unknown) {
      showAlert({
        title: 'Erro',
        message: erro instanceof Error ? erro.message : 'Erro desconhecido',
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
          imagem={require('../../../../assets/workouts/shoulders.jpg')}
          titulo="Recuperar senha"
          sub="Enviamos um link para você definir uma nova."
        />

        <View className="px-5">
          <Group footer="O link chega no e-mail cadastrado e vale por uma hora.">
            <Input
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!enviado}
            />
          </Group>

          <View className="gap-2.5">
            <Button
              label={enviado ? 'E-mail enviado' : 'Enviar link'}
              onPress={enviarLink}
              isLoading={loading}
              disabled={enviado}
              fullWidth
            />
            <Button label="Voltar" variant="ghost" fullWidth onPress={() => router.back()} />
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
