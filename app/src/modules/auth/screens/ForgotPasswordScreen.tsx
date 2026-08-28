import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, insira seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // O esquema é declarado em app.json como `elevapro`. Enquanto isto
        // apontava para `meupersonal://`, o link do e-mail não voltava para o
        // app — a recuperação de senha terminava em lugar nenhum.
        redirectTo: 'elevapro://reset-password',
      });

      if (error) throw error;

      setSent(true);
      Alert.alert('E-mail enviado!', 'Verifique sua caixa de entrada para redefinir sua senha.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: unknown) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <View className="flex-1 p-6">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#F4F4F5" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground font-display">
            Esqueci minha senha
          </Text>
        </View>

        <View className="flex-1 justify-center">
          <Card className="p-6">
            <View className="items-center mb-6">
              <View className="bg-primary/10 p-4 rounded-full mb-4 border border-primary/20">
                <Ionicons name="lock-closed-outline" size={48} color="#CCFF00" />
              </View>
              <Text className="text-foreground text-xl font-bold mb-2 font-display">
                Recuperar Senha
              </Text>
              <Text className="text-zinc-400 text-center text-sm font-sans">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </Text>
            </View>

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!sent}
            />

            <Button
              label={sent ? 'E-mail Enviado' : 'Enviar Link'}
              onPress={handleResetPassword}
              isLoading={loading}
              disabled={sent}
              className="mt-6"
            />

            {sent && (
              <View className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <Text className="text-green-400 text-sm text-center font-sans">
                  ✓ Verifique seu e-mail para continuar
                </Text>
              </View>
            )}
          </Card>
        </View>
      </View>
    </ScreenLayout>
  );
}
