import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useAuthStore } from '../store/authStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuthStore();

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
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check account status
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_status')
          .eq('id', user.id)
          .single();

        if (profile?.account_status === 'invited') {
          router.replace('/(auth)/pending-approval');
          setLoading(false);
          return;
          // O enum `account_status` do banco é `active | inactive | invited`.
          // Aqui se comparava com 'rejected' e 'suspended', que nunca
          // existiram: o ramo jamais executava e conta desativada entrava
          // normalmente. 'inactive' é o estado real de quem perdeu o acesso.
        } else if (profile?.account_status === 'inactive') {
          await supabase.auth.signOut();
          showAlert({
            title: 'Acesso Negado',
            message: 'Sua conta foi suspensa ou rejeitada. Entre em contato com o suporte.',
            type: 'error',
          });
        }
      }
    }
    setLoading(false);
  }

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Icon */}
        <View className="items-center mt-16 mb-12">
          <View className="w-28 h-28 rounded-full bg-primary/15 items-center justify-center mb-8 border-2 border-primary/30 shadow-lg shadow-primary/20">
            <Ionicons name="barbell" size={56} color="#A3E635" />
          </View>

          <Text className="text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Eleva Pro
          </Text>

          <Text className="text-lg text-zinc-400 text-center px-4 leading-7">
            Eleva seu nível.{'\n'}Acompanhamento que não para.
          </Text>
          <Text className="text-4xl mt-2">💪</Text>
        </View>

        {/* Login Form */}
        <View className="mb-6 gap-y-5">
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Button
            label="Entrar"
            onPress={handleLogin}
            isLoading={loading}
            className="mt-3"
            size="lg"
          />

          <Link href={'/(auth)/forgot-password' as never} asChild>
            <TouchableOpacity className="items-center py-2">
              <Text className="text-cyan-400 text-base font-semibold">Esqueci minha senha</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Divider */}
        <View className="flex-row items-center my-8">
          <View className="flex-1 h-[1px] bg-white/10" />
          <Text className="text-zinc-500 px-4 text-sm font-medium">ou</Text>
          <View className="flex-1 h-[1px] bg-white/10" />
        </View>

        {/* Student Login Button */}

        {/* Register Link */}
        <View className="flex-row justify-center items-center mt-auto mb-8">
          <Text className="text-zinc-400 text-base">Personal Trainer? </Text>
          <Link href={'/(auth)/register' as never} asChild>
            <TouchableOpacity>
              <Text className="text-primary text-base font-bold">Cadastre-se grátis</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
