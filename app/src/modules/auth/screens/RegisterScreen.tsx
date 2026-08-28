import { createAuthService, type ServiceType } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/components/ui/appAlert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { ServiceSelectionCard } from '@/components/ui/ServiceSelectionCard';

const authService = createAuthService(supabase);

type AccountRole = 'specialist' | 'student' | 'member';
type Step = 'role' | 'services' | 'personal_data';

export function RegisterScreen() {
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<AccountRole>('specialist');
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleRoleNext = () => {
    if (role === 'specialist') {
      setStep('services');
    } else {
      setStep('personal_data');
    }
  };

  const handleServicesNext = () => {
    if (selectedServices.length === 0) {
      showAlert({
        title: 'Atenção',
        message: 'Selecione pelo menos um serviço que você oferece',
        type: 'warning',
      });
      return;
    }
    setStep('personal_data');
  };

  const handleRegister = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      showAlert({ title: 'Erro', message: 'Digite seu nome completo', type: 'error' });
      return;
    }
    if (password.length < 8) {
      showAlert({
        title: 'Erro',
        message: 'A senha deve ter no mínimo 8 caracteres',
        type: 'error',
      });
      return;
    }
    if (password !== confirmPassword) {
      showAlert({ title: 'Erro', message: 'As senhas não coincidem', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      if (role === 'student') {
        const { data, error } = await authService.signUpStudent({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
        });
        if (error) throw error;
        if (!data.user) throw new Error('Erro ao criar usuário');
      } else if (role === 'member') {
        const { data, error } = await authService.signUpMember({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
        });
        if (error) throw error;
        if (!data.user) throw new Error('Erro ao criar usuário');
      } else {
        const { data, error } = await authService.signUpSpecialist({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          service_types: selectedServices,
        });
        if (error) throw error;
        if (!data.user) throw new Error('Erro ao criar usuário');
      }

      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido. Tente novamente.';
      if (message.toLowerCase().includes('already registered')) {
        showAlert({
          title: 'E-mail já cadastrado',
          message: 'Este e-mail já possui uma conta. Faça login.',
          type: 'warning',
        });
      } else {
        showAlert({ title: 'Erro no Cadastro', message: message, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const stepSubtitle: Record<Step, string> = {
    role: 'Como você vai usar o Eleva Pro?',
    services: 'Quais serviços você oferece?',
    personal_data: 'Complete seu cadastro',
  };

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="items-center mt-12 mb-8">
          <View className="w-24 h-24 rounded-full bg-primary/15 items-center justify-center mb-6 border-2 border-primary/30">
            <Ionicons name="person-add" size={48} color="#A3E635" />
          </View>
          <Text className="text-4xl font-extrabold text-foreground mb-3 tracking-tight text-center">
            Criar Conta
          </Text>
          <Text className="text-base text-muted text-center leading-6 px-4">
            {stepSubtitle[step]}
          </Text>
        </View>

        {/* Step 0: Seleção de role */}
        {step === 'role' && (
          <View className="flex-1">
            <View className="gap-y-3 mb-6">
              {[
                {
                  value: 'specialist' as AccountRole,
                  label: 'Sou Especialista',
                  sub: 'Personal trainer ou nutricionista',
                  icon: 'barbell-outline' as const,
                },
                {
                  value: 'student' as AccountRole,
                  label: 'Sou Aluno',
                  sub: 'Treino com personal trainer dedicado',
                  icon: 'flash-outline' as const,
                },
                {
                  value: 'member' as AccountRole,
                  label: 'Sou Membro',
                  sub: 'Crie seus próprios treinos e dietas',
                  icon: 'person-outline' as const,
                },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setRole(opt.value)}
                  className={`flex-row items-center gap-4 p-5 rounded-2xl border-2 ${
                    role === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <View
                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                      role === opt.value ? 'bg-primary/20' : 'bg-white/5'
                    }`}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={24}
                      color={role === opt.value ? '#A3E635' : '#71717a'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-bold text-base">{opt.label}</Text>
                    <Text className="text-muted text-sm mt-0.5">{opt.sub}</Text>
                  </View>
                  {role === opt.value && (
                    <Ionicons name="checkmark-circle" size={22} color="#A3E635" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Button label="Continuar" onPress={handleRoleNext} />
          </View>
        )}

        {/* Step 1: Seleção de serviços (specialist only) */}
        {step === 'services' && (
          <View className="flex-1">
            <Text className="text-muted text-sm mb-6">
              Selecione um ou mais serviços (pode alterar depois)
            </Text>

            <ServiceSelectionCard
              service="personal_training"
              selected={selectedServices.includes('personal_training')}
              onToggle={() => toggleService('personal_training')}
            />

            <ServiceSelectionCard
              service="nutrition_consulting"
              selected={selectedServices.includes('nutrition_consulting')}
              onToggle={() => toggleService('nutrition_consulting')}
            />

            <View className="flex-row gap-3 mt-6">
              <Button
                label="Voltar"
                onPress={() => setStep('role')}
                variant="outline"
                className="flex-1"
              />
              <Button label="Continuar" onPress={handleServicesNext} className="flex-1" />
            </View>
          </View>
        )}

        {/* Step 2: Dados pessoais */}
        {step === 'personal_data' && (
          <View className="flex-1">
            <View className="mb-6 gap-y-5">
              <Input
                label="Nome Completo"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Seu nome"
                autoCapitalize="words"
              />
              <Input
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="Senha"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                secureTextEntry
              />
              <Input
                label="Confirmar Senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Digite a senha novamente"
                secureTextEntry
              />
            </View>

            <View className="flex-row gap-3">
              <Button
                label="Voltar"
                onPress={() => setStep(role === 'specialist' ? 'services' : 'role')}
                variant="outline"
                className="flex-1"
              />

              <Button
                label="Criar Conta"
                onPress={handleRegister}
                isLoading={loading}
                size="lg"
                className="flex-1"
              />
            </View>
          </View>
        )}

        {/* Footer */}
        <View className="mt-auto">
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-[1px] bg-white/10" />
            <Text className="text-muted px-4 text-sm">ou</Text>
            <View className="flex-1 h-[1px] bg-white/10" />
          </View>

          <View className="flex-row justify-center items-center mb-6">
            <Text className="text-muted text-base">Já tem uma conta? </Text>
            <Link href={'/(auth)/login' as never} asChild>
              <TouchableOpacity>
                <Text className="text-primary text-base font-bold">Faça login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
