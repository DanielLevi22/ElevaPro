import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface StudentData {
  id?: string;
  full_name?: string;
  phone?: string;
  notes?: string;
  weight?: number | string;
  height?: number | string;
  assessment?: Record<string, number | string | null>;
}

interface StudentEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
  student: StudentData | null;
}

type Tab = 'personal' | 'measurements' | 'skinfolds';

export function StudentEditModal({ visible, onClose, onSave, student }: StudentEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [loading, setLoading] = useState(false);

  // Personal
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Measurements
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
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

  useEffect(() => {
    if (student) {
      setName(student.full_name || '');
      setPhone(student.phone || '');
      setNotes(student.notes || '');

      // Load assessment data
      const assessment = student.assessment || {};
      setWeight(student.weight?.toString() || assessment.weight?.toString() || '');
      setHeight(student.height?.toString() || assessment.height?.toString() || '');

      setNeck(assessment.neck?.toString() || '');
      setShoulder(assessment.shoulder?.toString() || '');
      setChest(assessment.chest?.toString() || '');
      setArmRightRelaxed(assessment.arm_right_relaxed?.toString() || '');
      setArmLeftRelaxed(assessment.arm_left_relaxed?.toString() || '');
      setArmRightContracted(assessment.arm_right_contracted?.toString() || '');
      setArmLeftContracted(assessment.arm_left_contracted?.toString() || '');
      setForearm(assessment.forearm?.toString() || '');
      setWaist(assessment.waist?.toString() || '');
      setAbdomen(assessment.abdomen?.toString() || '');
      setHips(assessment.hips?.toString() || '');
      setThighProximal(assessment.thigh_proximal?.toString() || '');
      setThighDistal(assessment.thigh_distal?.toString() || '');
      setCalf(assessment.calf?.toString() || '');

      setSkinfoldChest(assessment.skinfold_chest?.toString() || '');
      setSkinfoldAbdominal(assessment.skinfold_abdominal?.toString() || '');
      setSkinfoldThigh(assessment.skinfold_thigh?.toString() || '');
      setSkinfoldTriceps(assessment.skinfold_triceps?.toString() || '');
      setSkinfoldSuprailiac(assessment.skinfold_suprailiac?.toString() || '');
      setSkinfoldSubscapular(assessment.skinfold_subscapular?.toString() || '');
      setSkinfoldMidaxillary(assessment.skinfold_midaxillary?.toString() || '');
    }
  }, [student]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        name,
        phone,
        notes,
        weight,
        height,
        neck,
        shoulder,
        chest,
        arm_right_relaxed: armRightRelaxed,
        arm_left_relaxed: armLeftRelaxed,
        arm_right_contracted: armRightContracted,
        arm_left_contracted: armLeftContracted,
        forearm,
        waist,
        abdomen,
        hips,
        thigh_proximal: thighProximal,
        thigh_distal: thighDistal,
        calf,
        skinfold_chest: skinfoldChest,
        skinfold_abdominal: skinfoldAbdominal,
        skinfold_thigh: skinfoldThigh,
        skinfold_triceps: skinfoldTriceps,
        skinfold_suprailiac: skinfoldSuprailiac,
        skinfold_subscapular: skinfoldSubscapular,
        skinfold_midaxillary: skinfoldMidaxillary,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-950 rounded-t-3xl h-[90%] border-t border-zinc-900">
          {/* Header */}
          <View className="flex-row justify-between items-center p-6 border-b border-zinc-900">
            <Text className="text-white text-xl font-bold font-display">Editar Aluno</Text>
            <View className="flex-row items-center gap-3">
              {student?.id && (
                <Link href={`/students/${student.id}/history` as never} asChild>
                  <TouchableOpacity
                    onPress={onClose}
                    className="bg-zinc-900 p-2 rounded-full border border-zinc-800"
                  >
                    <Ionicons name="clipboard-outline" size={20} color="#FF6B35" />
                  </TouchableOpacity>
                </Link>
              )}
              <TouchableOpacity
                onPress={onClose}
                className="bg-zinc-900 p-2 rounded-full border border-zinc-800"
              >
                <Ionicons name="close" size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-zinc-900/50 p-1 mx-6 mt-4 rounded-xl border border-zinc-800">
            {(['personal', 'measurements', 'skinfolds'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
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

          <ScrollView contentContainerStyle={{ padding: 24 }}>
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
                        value={name}
                        onChangeText={setName}
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

                  <View className="flex-row gap-4">
                    {renderInput('Peso (kg)', weight, setWeight, '0.0', undefined, 'min-w-[45%]')}
                    {renderInput('Altura (cm)', height, setHeight, '0', undefined, 'min-w-[45%]')}
                  </View>

                  <View className="mb-4">
                    <Text className="text-white font-medium mb-2 ml-1">Observações</Text>
                    <TextInput
                      className="bg-zinc-900 rounded-xl border border-zinc-800 focus:border-orange-500 text-white text-base font-sans p-4 h-24"
                      placeholder="Objetivos, lesões, etc..."
                      placeholderTextColor="#52525B"
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      textAlignVertical="top"
                    />
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
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
              className="mt-6 mb-10"
            >
              <LinearGradient
                colors={['#FF6B35', '#FF2E63']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl py-4 items-center justify-center shadow-lg shadow-orange-500/20"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-lg font-bold font-display">
                    Salvar Alterações
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
