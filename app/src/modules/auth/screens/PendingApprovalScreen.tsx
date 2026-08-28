import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

export function PendingApprovalScreen() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Poll account status every 30 seconds
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile_status'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('account_status, full_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }, [router]);

  // Redirect if approved or rejected
  useEffect(() => {
    if (profile?.account_status === 'active') {
      router.replace('/(tabs)');
      // 'rejected' não existe no enum — o ramo nunca executava. Recusa e
      // desativação são o mesmo estado no banco: 'inactive'.
    } else if (profile?.account_status === 'inactive') {
      handleLogout();
    }
  }, [profile, router, handleLogout]);

  if (isLoading) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View className="items-center mt-16 mb-8">
          <View className="w-24 h-24 rounded-full bg-yellow-500/10 items-center justify-center mb-6 border-2 border-yellow-500/20">
            <Ionicons name="time-outline" size={48} color="#EAB308" />
          </View>
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-foreground text-center mb-3 tracking-tighter font-display">
          Aguardando Aprovação
        </Text>

        {/* Greeting */}
        {profile?.full_name && (
          <Text className="text-base text-zinc-400 text-center mb-6 font-sans">
            Olá, <Text className="text-foreground font-semibold">{profile.full_name}</Text>
          </Text>
        )}

        {/* Main Message */}
        <View className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <Text className="text-base text-zinc-400 text-center leading-6 mb-4 font-sans">
            Sua conta de profissional foi criada com sucesso e está em análise.
          </Text>

          <Text className="text-base text-zinc-400 text-center leading-6 font-sans">
            Para garantir a qualidade da nossa plataforma, todos os cadastros de profissionais
            passam por uma verificação manual.
          </Text>
        </View>

        {/* Time Estimate */}
        <View className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="hourglass-outline" size={20} color="#EAB308" />
            <Text className="text-sm text-yellow-500 font-medium font-sans">
              Tempo estimado: até 24 horas
            </Text>
          </View>
        </View>

        {/* Status Indicator */}
        <View className="flex-row items-center justify-center gap-2 mb-8">
          <View className="w-2 h-2 bg-yellow-500 rounded-full" style={{ opacity: 0.8 }} />
          <Text className="text-sm text-zinc-400 font-sans">
            Verificando status automaticamente...
          </Text>
        </View>

        {/* Info Box */}
        <View className="bg-surface border border-border rounded-2xl p-6 mb-8">
          <Text className="text-base font-semibold text-foreground mb-4 font-display">
            O que acontece agora?
          </Text>

          <View className="gap-y-3">
            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mt-0.5">
                <Text className="text-primary text-xs font-bold">1</Text>
              </View>
              <Text className="flex-1 text-sm text-zinc-400 leading-5 font-sans">
                Nossa equipe irá revisar suas informações
              </Text>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mt-0.5">
                <Text className="text-primary text-xs font-bold">2</Text>
              </View>
              <Text className="flex-1 text-sm text-zinc-400 leading-5 font-sans">
                Você receberá uma notificação quando for aprovado
              </Text>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mt-0.5">
                <Text className="text-primary text-xs font-bold">3</Text>
              </View>
              <Text className="flex-1 text-sm text-zinc-400 leading-5 font-sans">
                O app atualizará automaticamente quando aprovado
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Button
          label={isLoggingOut ? 'Saindo...' : 'Sair'}
          onPress={handleLogout}
          variant="outline"
          disabled={isLoggingOut}
          className="mb-6"
        />

        {/* Support */}
        <View className="items-center mt-auto mb-8">
          <Text className="text-xs text-zinc-500 text-center font-sans">
            Dúvidas? Entre em contato:
          </Text>
          <Text className="text-xs text-primary text-center mt-1 font-sans">
            suporte@elevapro.app
          </Text>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
