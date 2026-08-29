import { achatarRespostas, GENERAL_ANAMNESIS } from '@elevapro/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';

import { AnamnesisService } from '@/modules/assessment/services/anamnesisService';
import { AnamnesisResponseValue } from '@/modules/assessment/types/assessment';

export default function StudentAnamnesisScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams();

  // Local state to store the fetched responses for this specific student
  // This avoids overwriting the logged-in user's own anamnesis in the global store
  const [responses, setResponses] = useState<Record<string, AnamnesisResponseValue>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnamnesis = async () => {
      if (!studentId) return;

      try {
        setLoading(true);
        const data = await AnamnesisService.getAnamnesis(studentId as string);
        if (data?.responses) {
          // Achatado na carga: a coluna guarda duas formas, e ler `?.value`
          // de um valor plano mostraria "Não respondido" em todo campo — para
          // o especialista, aluno sem anamnese e anamnese em forma nova ficam
          // idênticos.
          setResponses(achatarRespostas(data.responses) as Record<string, AnamnesisResponseValue>);
        }
      } catch (error) {
        console.error('Failed to load anamnesis:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnamnesis();
  }, [studentId]);

  if (loading) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.solid} />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View className="px-6 py-4 border-b border-white/5 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white font-display">Anamnese do Aluno</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {GENERAL_ANAMNESIS.map((section) => (
          <View
            key={section.id}
            className="mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-white/5"
          >
            <Text className="text-lg font-bold text-orange-500 mb-4 font-display">
              {section.title}
            </Text>

            {section.questions.map((question) => {
              // Check visibility condition (same as wizard)
              if (question.condition) {
                const dependentAnswer = responses[question.condition.questionId];
                if (dependentAnswer !== question.condition.expectedValue) return null;
              }

              const response = responses[question.id];
              let displayValue = 'Não respondido';

              if (response !== undefined && response !== '') {
                if (typeof response === 'boolean') {
                  displayValue = response ? 'Sim' : 'Não';
                } else if (Array.isArray(response)) {
                  displayValue = response.join(', ');
                } else {
                  displayValue = String(response);
                }
              }

              return (
                <View key={question.id} className="mb-4 last:mb-0">
                  <Text className="text-zinc-400 text-sm mb-1 font-medium">{question.text}</Text>
                  <Text className="text-white text-base bg-black/40 p-3 rounded-lg border border-white/5">
                    {displayValue}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
        <View className="h-20" />
      </ScrollView>
    </ScreenLayout>
  );
}
