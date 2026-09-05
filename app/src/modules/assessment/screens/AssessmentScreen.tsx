import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssessmentStore } from '../store/assessmentStore';
import BodyScanIntroduction from './BodyScanIntroduction';
// Import Screens
import PhysicalAssessment from './PhysicalAssessment';

const { width } = Dimensions.get('window');

const TabButton = ({
  label,
  isActive,
  onPress,
  icon,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) => (
  <TouchableOpacity
    className="flex-1 flex-row items-center justify-center z-10 h-full"
    onPress={onPress}
    activeOpacity={0.8}
    // O rótulo da aba repete o título da tela, e leitor de tela anunciaria os
    // dois iguais. `accessibilityRole` diz que este é o que se toca.
    accessibilityRole="tab"
    accessibilityState={{ selected: isActive }}
    accessibilityLabel={label}
  >
    <Ionicons
      name={icon}
      size={18}
      color={isActive ? '#FFF' : '#71717A'}
      style={{ marginRight: 8 }}
    />
    <Text className={`font-bold text-sm ${isActive ? 'text-white' : 'text-zinc-500'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function AssessmentScreen() {
  const [activeTab, setActiveTab] = useState<'physical' | 'ai'>('ai');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setStudentId } = useAssessmentStore();

  useEffect(() => {
    console.log('🔍 AssessmentScreen (Wrapper) | Params ID:', id);
    if (id) {
      console.log('✅ AssessmentScreen | Setting Store ID:', id);
      setStudentId(id);
    } else {
      console.warn('⚠️ AssessmentScreen | No ID in params!');
    }
  }, [id, setStudentId]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: withSpring(activeTab === 'ai' ? 0 : (width - 48) / 2 - 2) },
        // 48 is padding horizontal (24*2), -2 for border correction
      ],
    };
  });

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 10 }}
        className="px-6 pb-4 bg-black border-b border-white/5 z-20"
      >
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg uppercase tracking-widest">Avaliação</Text>
          <View className="w-10" />
        </View>

        {/* Custom Tab Switcher */}
        <View className="h-12 bg-white/5 rounded-xl border border-white/10 flex-row relative mb-2 p-1">
          {/* Animated Background Indicator */}
          <Animated.View
            className="absolute top-1 left-1 bottom-1 w-[48%] bg-white/10 rounded-lg border border-white/5 shadow-sm"
            style={indicatorStyle}
          />

          <TabButton
            label="I.A. Vision"
            icon="scan-outline"
            isActive={activeTab === 'ai'}
            onPress={() => setActiveTab('ai')}
          />
          <TabButton
            label="Avaliação"
            icon="body-outline"
            isActive={activeTab === 'physical'}
            onPress={() => setActiveTab('physical')}
          />
        </View>
      </View>

      {/* Content Area */}
      <View className="flex-1">
        {activeTab === 'ai' ? (
          // Passing a prop to hide the internal header of BodyScanIntro since we have one here
          // We'll need to update BodyScanIntroduction to accept a hideHeader prop or just wrap it
          // For now, let's just render it. The nested header might be redundant but functional.
          // Ideally we refactor BodyScanIntroduction to lose its header or make it optional.
          <BodyScanIntroduction hideHeader={true} />
        ) : (
          <PhysicalAssessment />
        )}
      </View>
    </View>
  );
}
