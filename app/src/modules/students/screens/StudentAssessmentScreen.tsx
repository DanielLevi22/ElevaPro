import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { colors } from '@/constants/colors';
import { useCores } from '@/shared/design';

// Reusing the TabButton and helper components - ideally these should be shared, but for now inlining or importing would work.
// Since I can't easily import internal components from a screen file, I'll redefine TabButton here or imports if I move it to a component.
// For speed, I'll implement the Tab Switcher inline similar to AssessmentScreen.

import { PhysicalAssessment } from '@/assessment';

const { width } = Dimensions.get('window');

import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const TabButton = ({
  label,
  isActive,
  onPress,
  icon,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) => {
  const cores = useCores();
  return (
    <TouchableOpacity
      className="flex-1 flex-row items-center justify-center z-10 h-full"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isActive ? cores.foreground : cores.placeholder}
        style={{ marginRight: 8 }}
      />
      <Text className={`font-bold text-sm ${isActive ? 'text-white' : 'text-zinc-500'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function StudentAssessmentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const _insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('🔍 StudentAssessmentScreen | ID:', id);
  }, [id]);

  // Hide TabBar when this screen is active
  useLayoutEffect(() => {
    // We need to find the tab navigator parent.
    // Usually navigation.getParent() works if we are directly receiving the tab nav.
    // But since we might be in a stack inside tabs, we might need to go up.
    // However, the tab bar options are usually respected if set on the screen options of the stack which is a child of Tabs.
    // But modifying the parent navigator (Tabs) options from here is the most direct way.

    // Attempt to hide tab bar
    const parent = navigation.getParent();
    parent?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      parent?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const [activeTab, setActiveTab] = useState<'ai' | 'physical'>('ai');

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(activeTab === 'ai' ? 0 : (width - 48) / 2 - 2) }],
    };
  });

  return (
    <ScreenLayout className="bg-black">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-2 z-10">
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white font-display">Avaliação Corporal</Text>
            <View className="w-10" />
          </View>

          {/* Tab Switcher */}
          <View className="h-12 bg-white/5 rounded-xl border border-white/10 flex-row relative mb-4 p-1">
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

        {activeTab === 'physical' ? (
          <PhysicalAssessment />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {/* New Assessment Action */}
            <View className="px-6 mt-6 mb-2">
              <TouchableOpacity
                className="w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/20"
                onPress={() =>
                  router.push({
                    pathname: '/assessment/body-scan',
                    params: { id: id },
                  } as never)
                }
              >
                <Ionicons name="scan" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-lg uppercase tracking-widest">
                  Nova Avaliação IA
                </Text>
              </TouchableOpacity>
            </View>

            {/* Aqui havia um ramo com o resultado da análise, preso a um estado que
                nunca era preenchido — a análise é sempre de quem a faz, e o
                especialista não produz uma. Saiu com a issue 316, que tirou do tipo os
                campos que ele lia. */}
            <View className="items-center justify-center py-20">
              <Ionicons name="alert-circle-outline" size={64} color={colors.status.error} />
              <Text className="text-white text-lg font-bold mt-4">Avaliação não encontrada</Text>
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}
