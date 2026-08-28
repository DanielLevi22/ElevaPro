import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useAuthStore } from '@/auth';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { useStudentStore } from '../store/studentStore';

type Tab = 'personal' | 'measurements' | 'skinfolds';

export default function CreateStudentScreen() {
  const router = useRouter();
  const { createStudent, addPhysicalAssessment, isLoading } = useStudentStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('personal');

  // Personal
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');

  // Measurements (Circumferences)
  const [neck, setNeck] = useState('');
  const [shoulder, setShoulder] = useState('');
  const [chest, setChest] = useState('');
  const [armRightRelaxed, setArmRightRelaxed] = useState('');
  const [armLeftRelaxed, setArmLeftRelaxed] = useState('');
  const [armRightContracted, setArmRightContracted] = useState('');
  const [armLeftContracted, setArmLeftContracted] = useState('');
  const [forearm, setForearm] = useState('');
  const [waist, setWaist] = useState('');
  const [abdomen, setAbdomen] = useState('');
  const [hips, setHips] = useState('');
  const [thighProximal, setThighProximal] = useState('');
  const [thighDistal, setThighDistal] = useState('');
  const [calf, setCalf] = useState('');

  // Skinfolds
  const [skinfoldChest, setSkinfoldChest] = useState('');
  const [skinfoldAbdominal, setSkinfoldAbdominal] = useState('');
  const [skinfoldThigh, setSkinfoldThigh] = useState('');
  const [skinfoldTriceps, setSkinfoldTriceps] = useState('');
  const [skinfoldSuprailiac, setSkinfoldSuprailiac] = useState('');
  const [skinfoldSubscapular, setSkinfoldSubscapular] = useState('');
  const [skinfoldMidaxillary, setSkinfoldMidaxillary] = useState('');

  const handleTabChange = (tab: Tab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleCreate = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do aluno na aba "Dados".');
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, informe e-mail e senha para o aluno.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const result = await createStudent({
      specialist_id: user.id,
      full_name: fullName,
      email: email.trim(),
      password: password.trim(),
      service_type: 'personal_training',
    });

    if (result.success && result.studentId) {
      const hasMeasurements = [
        neck,
        shoulder,
        chest,
        armRightRelaxed,
        armLeftRelaxed,
        forearm,
        waist,
        abdomen,
        hips,
        thighProximal,
        thighDistal,
        calf,
        skinfoldChest,
        skinfoldAbdominal,
        skinfoldThigh,
        skinfoldTriceps,
        skinfoldSuprailiac,
        skinfoldSubscapular,
        skinfoldMidaxillary,
      ].some((v) => v !== '');

      if (hasMeasurements) {
        const p = (v: string) => (v ? parseFloat(v) : null);
        await addPhysicalAssessment(result.studentId, {
          circ_neck: p(neck),
          circ_shoulder: p(shoulder),
          circ_chest: p(chest),
          circ_waist: p(waist),
          circ_abdomen: p(abdomen),
          circ_hip: p(hips),
          circ_right_arm: p(armRightRelaxed),
          circ_left_arm: p(armLeftRelaxed),
          circ_right_forearm: p(forearm),
          circ_right_thigh: p(thighProximal),
          circ_right_calf: p(calf),
          skinfold_chest: p(skinfoldChest),
          skinfold_abdomen: p(skinfoldAbdominal),
          skinfold_thigh: p(skinfoldThigh),
          skinfold_tricep: p(skinfoldTriceps),
          skinfold_suprailiac: p(skinfoldSuprailiac),
          skinfold_subscapular: p(skinfoldSubscapular),
          skinfold_midaxillary: p(skinfoldMidaxillary),
        });
      }

      router.replace({
        pathname: '/(tabs)/students/invite',
        params: { studentId: result.studentId, name: fullName },
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', result.error || 'Falha ao cadastrar aluno');
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string = '0',
    icon?: React.ComponentProps<typeof Ionicons>['name'],
    widthClass: string = 'min-w-[45%]'
  ) => (
    <View className={`flex-1 ${widthClass} mb-4`}>
      <Text className="text-zinc-400 text-xs font-bold mb-2 ml-1 uppercase">{label}</Text>
      <View className="bg-zinc-900 rounded-xl border border-zinc-800 focus:border-orange-500 flex-row items-center px-4 h-12">
        {icon && <Ionicons name={icon} size={18} color="#71717A" style={{ marginRight: 8 }} />}
        <TextInput
          className="flex-1 text-white text-base font-sans"
          placeholder={placeholder}
          placeholderTextColor="#52525B"
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  return (
    <ScreenLayout>
      <View className="flex-1">
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 pt-4 pb-2">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center mr-4"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-2xl font-extrabold text-white font-display tracking-tight">
              Novo Aluno
            </Text>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
            {(['personal', 'measurements', 'skinfolds'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabChange(tab)}
                className={`flex-1 py-2 items-center rounded-lg ${activeTab === tab ? 'bg-zinc-800' : ''}`}
              >
                <Text
                  className={`text-xs font-bold ${activeTab === tab ? 'text-orange-500' : 'text-zinc-500'}`}
                >
                  {tab === 'personal' ? 'DADOS' : tab === 'measurements' ? 'MEDIDAS' : 'DOBRAS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <Animated.View
            entering={FadeInRight.springify()}
            layout={Layout.springify()}
            key={activeTab} // Force re-render animation on tab change
          >
            {activeTab === 'personal' && (
              <View className="space-y-6">
                <View className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                  <Text className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">
                    Informações Básicas
                  </Text>

                  <View className="mb-4">
                    <Text className="text-white font-medium mb-2 ml-1">Nome Completo</Text>
                    <View className="bg-zinc-900 rounded-xl border border-zinc-800 focus:border-orange-500 flex-row items-center px-4 h-12">
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color="#71717A"
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        className="flex-1 text-white text-base font-sans"
                        placeholder="Ex: João Silva"
                        placeholderTextColor="#52525B"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-white font-medium mb-2 ml-1">Telefone</Text>
                    <View className="bg-zinc-900 rounded-xl border border-zinc-800 focus:border-orange-500 flex-row items-center px-4 h-12">
                      <Ionicons
                        name="call-outline"
                        size={20}
                        color="#71717A"
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        className="flex-1 text-white text-base font-sans"
                        placeholder="(00) 00000-0000"
                        placeholderTextColor="#52525B"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-white font-medium mb-2 ml-1">E-mail de Acesso</Text>
                    <View className="bg-zinc-900 rounded-xl border border-zinc-800 focus:border-orange-500 flex-row items-center px-4 h-12">
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color="#71717A"
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        className="flex-1 text-white text-base font-sans"
                        placeholder="email@exemplo.com"
                        placeholderTextColor="#52525B"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-white font-medium mb-2 ml-1">Senha de Acesso</Text>
                    <View className="bg-zinc-900 rounded-xl border border-zinc-800 focus:border-orange-500 flex-row items-center px-4 h-12">
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#71717A"
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        className="flex-1 text-white text-base font-sans"
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor="#52525B"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-4">
                    {renderInput('Idade', age, setAge, '0', undefined, 'min-w-[28%]')}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'measurements' && (
              <View className="space-y-6">
                <View className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                  <Text className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">
                    Circunferências (cm)
                  </Text>

                  <View className="flex-row flex-wrap gap-2 justify-between">
                    {renderInput('Pescoço', neck, setNeck)}
                    {renderInput('Ombro', shoulder, setShoulder)}
                    {renderInput('Peito', chest, setChest)}
                    {renderInput('Antebraço', forearm, setForearm)}
                    {renderInput('Braço Dir. (Rel)', armRightRelaxed, setArmRightRelaxed)}
                    {renderInput('Braço Esq. (Rel)', armLeftRelaxed, setArmLeftRelaxed)}
                    {renderInput('Braço Dir. (Con)', armRightContracted, setArmRightContracted)}
                    {renderInput('Braço Esq. (Con)', armLeftContracted, setArmLeftContracted)}
                    {renderInput('Cintura', waist, setWaist)}
                    {renderInput('Abdômen', abdomen, setAbdomen)}
                    {renderInput('Quadril', hips, setHips)}
                    {renderInput('Panturrilha', calf, setCalf)}
                    {renderInput('Coxa Prox.', thighProximal, setThighProximal)}
                    {renderInput('Coxa Distal', thighDistal, setThighDistal)}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'skinfolds' && (
              <View className="space-y-6">
                <View className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                  <Text className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">
                    Dobras Cutâneas (mm)
                  </Text>

                  <View className="flex-row flex-wrap gap-2 justify-between">
                    {renderInput('Peitoral', skinfoldChest, setSkinfoldChest)}
                    {renderInput('Abdominal', skinfoldAbdominal, setSkinfoldAbdominal)}
                    {renderInput('Coxa', skinfoldThigh, setSkinfoldThigh)}
                    {renderInput('Tríceps', skinfoldTriceps, setSkinfoldTriceps)}
                    {renderInput('Supra-ilíaca', skinfoldSuprailiac, setSkinfoldSuprailiac)}
                    {renderInput('Subescapular', skinfoldSubscapular, setSkinfoldSubscapular)}
                    {renderInput('Axilar Média', skinfoldMidaxillary, setSkinfoldMidaxillary)}
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreate}
              disabled={isLoading}
              activeOpacity={0.8}
              className="mt-6 mb-10"
            >
              <LinearGradient
                colors={['#CCFF00', '#A3CC00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl py-4 items-center justify-center shadow-lg shadow-orange-500/20"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-lg font-bold font-display">Cadastrar Aluno</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
