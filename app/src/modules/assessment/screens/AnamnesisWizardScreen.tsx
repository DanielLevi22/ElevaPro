import { GENERAL_ANAMNESIS } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { showAlert } from '@/components/ui/appAlert';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { StatusModal, StatusModalType } from '@/components/ui/StatusModal';
import { QuestionInput } from '../components/QuestionInput';
import { useAssessmentStore } from '../store/assessmentStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AnamnesisWizardScreen() {
  const router = useRouter();
  const {
    currentSectionIndex,
    anamnesisResponses,
    setAnamnesisResponse,
    setSectionIndex,
    submitAnamnesis,
    setStudentId,
    syncAnamnesis,
    studentId,
  } = useAssessmentStore();

  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: StatusModalType;
    title: string;
    message: string;
    onClose?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = (
    type: StatusModalType,
    title: string,
    message: string,
    onClose?: () => void
  ) => {
    setModalConfig({ visible: true, type, title, message, onClose });
  };

  const hideModal = () => {
    const callback = modalConfig.onClose;
    setModalConfig((prev) => ({ ...prev, visible: false }));
    if (callback) callback();
  };

  useEffect(() => {
    const initSession = async () => {
      // If we already have a studentId, just sync (or do nothing if we want to trust local state)
      // But usually good to ensure we have the logged in user
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        if (session.user.id !== studentId) {
          console.log('Initializing Anamnesis for user:', session.user.id);
          setStudentId(session.user.id);
          await syncAnamnesis(session.user.id);
        } else {
          // Already has ID, but maybe ensuring sync?
          // await syncAnamnesis(session.user.id);
        }
      } else {
        showAlert({ title: 'Erro', message: 'Usuário não autenticado.', type: 'error' });
        router.back();
      }
    };

    initSession();
  }, [studentId, setStudentId, syncAnamnesis, router]);

  const currentSection = GENERAL_ANAMNESIS[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === GENERAL_ANAMNESIS.length - 1;

  // Calculate progress
  // Calculate progress
  const progress = ((currentSectionIndex + 1) / GENERAL_ANAMNESIS.length) * 100;

  // Progress animation
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withSpring(progress, { damping: 15 });
  }, [progress, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleNext = () => {
    // Validation
    const missingFields = currentSection.questions.filter((q) => {
      // Check if required
      if (!q.required) return false;

      // Check condition (skip if condition not met)
      if (q.condition) {
        const dependentAnswer = anamnesisResponses[q.condition.questionId];
        if (dependentAnswer !== q.condition.expectedValue) return false;
      }

      const answer = anamnesisResponses[q.id];
      return (
        answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)
      );
    });

    if (missingFields.length > 0) {
      showModal(
        'warning',
        'Atenção',
        `Por favor, responda: ${missingFields.map((q) => q.text).join(', ')}`
      );
      return;
    }

    // Trigger smooth transition
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isLastSection) {
      handleSubmit();
    } else {
      setSectionIndex(currentSectionIndex + 1);
    }
  };

  const handleBack = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isFirstSection) {
      router.back();
    } else {
      setSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await submitAnamnesis();
      showModal('success', 'Sucesso', 'Anamnese enviada com sucesso!', () => {
        router.back();
      });
    } catch (_error) {
      showModal('error', 'Erro', 'Ocorreu um erro ao enviar a anamnese.');
    }
  };

  return (
    <ScreenLayout>
      <SafeAreaView className="flex-1">
        {/* Header with Progress */}
        <View className="px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-zinc-500 font-bold font-sans text-xs uppercase tracking-widest">
                Passo {currentSectionIndex + 1} de {GENERAL_ANAMNESIS.length}
              </Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          <View className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <Animated.View className="h-full bg-orange-500 rounded-full" style={progressStyle} />
          </View>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {/* Animated Container for questions that fades in on section change */}
          <Animated.View
            key={currentSection.id}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(200)}
          >
            <Text className="text-2xl font-black text-white mb-2 font-display uppercase tracking-tight leading-8">
              {currentSection.title}
            </Text>
            <View className="w-10 h-1 bg-orange-500 rounded-full mb-8" />

            {currentSection.questions.map((question) => {
              // Check visibility condition
              if (question.condition) {
                const dependentAnswer = anamnesisResponses[question.condition.questionId];
                if (dependentAnswer !== question.condition.expectedValue) return null;
              }

              return (
                <QuestionInput
                  key={question.id}
                  question={question}
                  value={anamnesisResponses[question.id]}
                  onChange={(val) =>
                    setAnamnesisResponse(question.id, val as string | number | boolean | string[])
                  }
                />
              );
            })}

            <View className="h-24" />
          </Animated.View>
        </ScrollView>

        {/* Footer Actions */}
        <View className="px-6 py-6 border-t border-white/10 bg-black/90 pb-8">
          <TouchableOpacity activeOpacity={0.9} onPress={handleNext}>
            <LinearGradient
              colors={['#F97316', '#EA580C']} // Orange 500 to 600
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 rounded-2xl items-center shadow-lg shadow-orange-500/20"
            >
              <Text className="text-white font-bold text-lg font-display tracking-wide uppercase">
                {isLastSection ? 'Finalizar Anamnese' : 'Próxima Etapa'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <StatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={hideModal}
      />
    </ScreenLayout>
  );
}
