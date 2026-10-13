import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Hook para animação de confete ao completar meta
 */
export function useConfettiAnimation(trigger: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Animated refs are stable
  useEffect(() => {
    if (trigger) {
      // Haptic feedback forte
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animação de confete
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        scale.setValue(0);
      });
    }
  }, [trigger]);

  return { opacity, scale };
}
