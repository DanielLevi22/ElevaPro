import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth';
import { StudentPickerModal } from '@/components/StudentPickerModal';
import { Input } from '@/components/ui/Input';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusModal } from '@/components/ui/StatusModal';
import { colors as brandColors } from '@/constants/colors';
import { useNutritionStore } from '../store/nutritionStore';
import {
  calculateDietStrategy,
  DIET_STRATEGIES,
  type DietStrategyType,
} from '../utils/dietStrategies';

export default function CreateDietScreen() {
  const router = useRouter();
  const { user, accountType } = useAuthStore();
  const isMember = accountType === 'member';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);

  // Macros
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');

  // Strategy
  const [selectedStrategy, setSelectedStrategy] = useState<DietStrategyType>('standard');
  const [targetCalories, setTargetCalories] = useState('2000'); // Base calories for strategy

  const [loading, setLoading] = useState(false);
  // `profiles.full_name` é nulável: o perfil nasce no signup antes de o nome
  // ser informado.
  const [students, setStudents] = useState<{ id: string; full_name: string | null }[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const { createDietPlanWithStrategy } = useNutritionStore();

  // Auto-calculate macros based on strategy and target calories
  useEffect(() => {
    if (targetCalories) {
      const result = calculateDietStrategy(selectedStrategy, parseFloat(targetCalories) || 0);
      setCalories(result.averageMacros.calories.toString());
      setProtein(result.averageMacros.protein.toString());
      setCarbs(result.averageMacros.carbs.toString());
      setFat(result.averageMacros.fat.toString());
    }
  }, [selectedStrategy, targetCalories]);

  // Previous auto-calculate (Manually disabled to prefer strategy calculation, or we keep it for manual overrides?)
  // Let's comment out the old effect that listened to P/C/F changes for now,
  // or better, make it only run if we aren't using the strategy calculator loop.
  // Actually, the previous effect calculated Total Calories from P/C/F.
  // The new flow drives P/C/F from Total Calories + Strategy.
  // If the user manually edits P/C/F, we should update Total Calories.

  useEffect(() => {
    // This effect ensures if user manually types P/C/F, the total updates.
    // But we need to avoid an infinite loop if we also set P/C/F from strategy.
    // The strategy effect runs on [selectedStrategy, targetCalories].
    // This one runs on [protein, carbs, fat].
    // It should be fine as long as we don't set targetCalories here.
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;

    // Only update if the values differ significantly to avoid rounding loops
    const calculated = p * 4 + c * 4 + f * 9;
    const current = parseFloat(calories) || 0;

    if (Math.abs(calculated - current) > 5 && (p || c || f)) {
      // If user manually changed macros, update total.
      setCalories(Math.round(calculated).toString());
    }
  }, [protein, carbs, fat, calories]);

  // Fetch students on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchStudents is stable — avoids useCallback refactor
  useEffect(() => {
    fetchStudents();
  }, [user]);

  const fetchStudents = async () => {
    if (!user?.id) return;

    try {
      // 1. Fetch active students
      const { data: activeData, error: activeError } = await supabase
        .from('student_specialists')
        .select(`
          student:profiles!student_id (
            id,
            full_name
          )
        `)
        .eq('specialist_id', user.id)
        .eq('status', 'active');

      // 2. Fetch pending students
      // 'pending' não existe no enum `account_status` — este filtro nunca
      // casava e a lista de alunos convidados vinha sempre vazia. Aluno criado
      // pelo especialista nasce 'invited' (ver POST /api/students).
      const { data: pendingData, error: pendingError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('account_type', 'student')
        .eq('account_status', 'invited');
      // .not('invite_code', 'is', null);

      if (!activeError && !pendingError) {
        const activeList =
          activeData
            ?.flatMap((item) =>
              Array.isArray(item.student) ? item.student : item.student ? [item.student] : []
            )
            .filter(Boolean) || [];
        const pendingList = pendingData || [];

        // Merge and deduplicate (prefer active profile if both exist)
        const allStudents = [...activeList, ...pendingList];
        const uniqueStudents = Array.from(
          new Map(allStudents.map((item) => [item.id, item])).values()
        );

        setStudents(uniqueStudents);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setStatusModal({
        visible: true,
        title: 'Campo Obrigatório',
        message: 'O nome do plano é essencial para a organização.',
        type: 'warning',
      });
      return;
    }

    if (!isMember && !studentId) {
      setStatusModal({
        visible: true,
        title: 'Seleção Pendente',
        message: 'Por favor, selecione um aluno para este plano.',
        type: 'warning',
      });
      return;
    }

    if (!user?.id) return;

    setLoading(true);

    try {
      // Calculate final strategy data to ensure freshness
      const strategyResult = calculateDietStrategy(
        selectedStrategy,
        parseFloat(targetCalories) || 0
      );

      const planData = {
        name,
        description: description || strategyResult.description, // Use strategy desc if empty
        student_id: isMember ? user.id : studentId,
        specialist_id: isMember ? null : user.id,
        start_date: startDate.toISOString().split('T')[0],
        status: 'active',
        // These global targets are averages now, helpful for quick ref
        target_protein: parseFloat(protein) || 0,
        target_carbs: parseFloat(carbs) || 0,
        target_fat: parseFloat(fat) || 0,
        target_calories: parseFloat(calories) || 0,
        plan_type: selectedStrategy === 'carb_cycling' ? 'cyclic' : 'unique',
      };

      await createDietPlanWithStrategy(planData as never, strategyResult);

      setStatusModal({
        visible: true,
        title: 'Sucesso Total',
        message: 'Plano alimentar arquitetado e liberado para o aluno!',
        type: 'success',
        onClose: () => router.back(),
      });
    } catch (error) {
      console.error('Error creating diet plan:', error);
      setStatusModal({
        visible: true,
        title: 'Falha Técnica',
        message: 'Não conseguimos salvar o plano no momento. Tente novamente.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === studentId);

  return (
    <ScreenLayout>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View
          className="flex-row items-center px-6 py-5 border-b"
          style={{
            backgroundColor: brandColors.background.secondary,
            borderColor: brandColors.border.dark,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2.5 rounded-xl mr-5 border"
            style={{
              backgroundColor: brandColors.background.primary,
              borderColor: brandColors.border.dark,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={brandColors.primary.start} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-white font-display tracking-tight italic">
              NOVO PLANO
            </Text>
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Arquitetura Nutricional
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
          {/* Strategy Selector */}
          <View className="mb-8 mt-6">
            <Text className="text-zinc-500 font-black text-[10px] tracking-widest uppercase mb-4 ml-1">
              ESTRATÉGIA NUTRICIONAL
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-4">
                {(Object.keys(DIET_STRATEGIES) as DietStrategyType[]).map((strategy) => {
                  const isSelected = selectedStrategy === strategy;
                  return (
                    <TouchableOpacity
                      key={strategy}
                      onPress={() => setSelectedStrategy(strategy)}
                      className="p-5 rounded-[32px] border w-44 h-52 justify-between shadow-sm"
                      style={{
                        backgroundColor: isSelected
                          ? brandColors.background.elevated
                          : brandColors.background.secondary,
                        borderColor: isSelected
                          ? brandColors.primary.start
                          : brandColors.border.dark,
                      }}
                    >
                      <View>
                        <LinearGradient
                          colors={
                            isSelected ? brandColors.gradients.primary : ['#27272A', '#18181B']
                          }
                          className="w-12 h-12 rounded-2xl items-center justify-center mb-4"
                        >
                          <Ionicons
                            name={DIET_STRATEGIES[strategy].icon as keyof typeof Ionicons.glyphMap}
                            size={24}
                            color={isSelected ? '#FFF' : '#71717A'}
                          />
                        </LinearGradient>
                        <Text
                          className={`font-black text-base italic font-display uppercase tracking-tight ${
                            isSelected ? 'text-white' : 'text-zinc-500'
                          }`}
                        >
                          {DIET_STRATEGIES[strategy].label}
                        </Text>
                      </View>
                      <Text
                        className="text-zinc-500 text-[10px] leading-4 font-medium italic"
                        numberOfLines={3}
                      >
                        {DIET_STRATEGIES[strategy].description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Target Calories Input (Primary Driver) */}
            <View
              className="p-5 rounded-3xl border mb-6"
              style={{
                backgroundColor: brandColors.background.secondary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Text className="text-zinc-500 font-black text-[10px] tracking-widest uppercase mb-3">
                META CALÓRICA (BASE)
              </Text>
              <Input
                value={targetCalories}
                onChangeText={setTargetCalories}
                placeholder="2000"
                keyboardType="numeric"
                className="text-2xl font-black font-display italic text-white h-14"
              />
              <Text className="text-zinc-600 text-[10px] font-medium italic mt-2">
                * Este valor guiará os cálculos automáticos de P/C/G para a semana.
              </Text>
            </View>

            {/* Strategy Preview */}
            <View
              className="p-6 rounded-[32px] border"
              style={{
                backgroundColor: brandColors.background.secondary,
                borderColor: brandColors.border.dark,
              }}
            >
              <Text className="text-zinc-500 font-black text-[10px] tracking-widest uppercase mb-5">
                CRONOGRAMA SEMANAL
              </Text>

              {(() => {
                const preview = calculateDietStrategy(
                  selectedStrategy,
                  parseFloat(targetCalories) || 0
                );
                const groupedDays = preview.weeklySchedule.reduce(
                  (acc, day) => {
                    if (!acc[day.label]) acc[day.label] = [];
                    acc[day.label].push(day);
                    return acc;
                  },
                  {} as Record<string, typeof preview.weeklySchedule>
                );

                return (
                  <View className="gap-4">
                    {Object.entries(groupedDays).map(([label, days]) => {
                      const representative = days[0];
                      const dayNames = days
                        .map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.dayOfWeek])
                        .join(', ');

                      return (
                        <View
                          key={label}
                          className="flex-row items-center justify-between py-3 border-b border-zinc-800/30"
                        >
                          <View className="flex-1">
                            <Text className="text-white font-black text-sm font-display italic uppercase tracking-tight">
                              {label}
                            </Text>
                            <Text className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-0.5">
                              {dayNames}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              className="font-black text-sm italic"
                              style={{ color: brandColors.primary.start }}
                            >
                              {representative.macros.calories} KCAL
                            </Text>
                            <Text className="text-zinc-600 text-[9px] font-black uppercase tracking-tighter mt-0.5">
                              P:{representative.macros.protein}G | C:{representative.macros.carbs}G
                              | G:{representative.macros.fat}G
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Nome */}
          <View className="mb-4">
            <Text className="text-foreground text-sm font-semibold mb-2 font-sans">
              Nome do Plano *
            </Text>
            <Input value={name} onChangeText={setName} placeholder="Ex: Cutting - Fase 1" />
          </View>

          {/* Student Selector — hidden for member (uses own account) */}
          {!isMember && (
            <View className="mb-4">
              <Text className="text-foreground text-sm font-semibold mb-2 font-sans">Aluno *</Text>
              <TouchableOpacity
                onPress={() => setShowStudentPicker(!showStudentPicker)}
                className="bg-zinc-900/80 border-2 border-zinc-700 rounded-2xl px-4 py-4 flex-row items-center justify-between"
              >
                <Text
                  className={
                    selectedStudent ? 'text-foreground text-base' : 'text-zinc-500 text-base'
                  }
                >
                  {selectedStudent ? selectedStudent.full_name : 'Selecione um aluno'}
                </Text>
                <Ionicons
                  name={showStudentPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#71717A"
                />
              </TouchableOpacity>

              <StudentPickerModal
                visible={showStudentPicker}
                onClose={() => setShowStudentPicker(false)}
                onSelect={(student) => setStudentId(student.id)}
                students={students}
                selectedStudentId={studentId}
              />
            </View>
          )}

          {/* Start Date */}
          <View className="mb-4">
            <Text className="text-foreground text-sm font-semibold mb-2 font-sans">
              Data de Início *
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              className="bg-zinc-900/80 border-2 border-zinc-700 rounded-2xl px-4 py-4 flex-row items-center justify-between"
            >
              <Ionicons name="calendar-outline" size={20} color="#00D9FF" />
              <Text className="text-foreground text-base flex-1 ml-3">
                {startDate.toLocaleDateString('pt-BR')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#71717A" />
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate && event.type === 'set') {
                    setStartDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Macros */}
          <View className="mb-6">
            <Text className="text-foreground text-sm font-semibold mb-3 font-sans">
              Metas Diárias (Macros)
            </Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-zinc-400 text-xs mb-1 ml-1">Proteína (g)</Text>
                <Input
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  keyboardType="numeric"
                  className="text-center"
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-xs mb-1 ml-1">Carboidratos (g)</Text>
                <Input
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  keyboardType="numeric"
                  className="text-center"
                />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 text-xs mb-1 ml-1">Gorduras (g)</Text>
                <Input
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  keyboardType="numeric"
                  className="text-center"
                />
              </View>
            </View>

            <View>
              <Text className="text-zinc-400 text-xs mb-1 ml-1">Calorias Totais (kcal)</Text>
              <Input
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                keyboardType="numeric"
              />
              <Text className="text-zinc-500 text-xs mt-1 ml-1">
                * Calculado automaticamente: (P×4) + (C×4) + (G×9)
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-foreground text-sm font-semibold mb-2 font-sans">
              Descrição / Observações
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Instruções gerais para o aluno..."
              placeholderTextColor="#52525B"
              multiline
              numberOfLines={4}
              className="bg-zinc-900/80 rounded-2xl p-4 text-foreground text-base h-24 border-2 border-zinc-700"
              style={{ color: '#FFFFFF' }}
              textAlignVertical="top"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity activeOpacity={0.8} onPress={handleSave} disabled={loading}>
            <LinearGradient
              colors={brandColors.gradients.primary}
              className="rounded-3xl py-6 items-center shadow-2xl mb-10"
              style={{
                shadowColor: brandColors.primary.start,
                shadowOpacity: 0.4,
                shadowRadius: 15,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-base font-black font-display uppercase tracking-widest italic">
                  Consolidar Plano Nutricional
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusModal
        visible={statusModal.visible}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        onClose={() => {
          setStatusModal((prev) => ({ ...prev, visible: false }));
          statusModal.onClose?.();
        }}
      />
    </ScreenLayout>
  );
}
