import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// O expo-router publica o compat como `expo-router/react-navigation`, mas sem
// shim para os subpacotes — o de bottom-tabs só resolve pelo caminho de build.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import React, { memo, useMemo } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../modules/auth/store/authStore';

type Route = BottomTabBarProps['state']['routes'][number];
type NavState = BottomTabBarProps['state'];
type Nav = BottomTabBarProps['navigation'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;
const NOTCH_WIDTH = 160;
const NOTCH_CURVE = 44;

const routeOrder = ['index', 'workouts', 'progress', 'nutrition', 'students', 'ranking'];

const getPath = () => {
  const w = SCREEN_WIDTH * 0.92 - 2;
  const h = TAB_BAR_HEIGHT - 2;
  const r = 40;
  const mx = 1;
  const my = 1;
  const centerX = w / 2;
  const notchHalfWidth = NOTCH_WIDTH / 2;
  const smoothFactor = 15;

  return `
    M ${mx} ${r + my}
    Q ${mx} ${my} ${r + mx} ${my}
    H ${centerX - notchHalfWidth - NOTCH_CURVE / 2 + mx}
    C ${centerX - notchHalfWidth + mx} ${my}, ${centerX - notchHalfWidth + smoothFactor + mx} ${NOTCH_CURVE + my}, ${centerX + mx} ${NOTCH_CURVE + my}
    C ${centerX + notchHalfWidth - smoothFactor + mx} ${NOTCH_CURVE + my}, ${centerX + notchHalfWidth + mx} ${my}, ${centerX + notchHalfWidth + NOTCH_CURVE / 2 + mx} ${my}
    H ${w - r + mx}
    Q ${w + mx} ${my} ${w + mx} ${r + my}
    V ${h - r + my}
    Q ${w + mx} ${h + my} ${w - r + mx} ${h + my}
    H ${r + mx}
    Q ${mx} ${h + my} ${mx} ${h - r + my}
    Z
  `;
};

const TabItem = memo(
  ({
    route,
    state,
    navigation,
    isDragging,
  }: {
    route: Route;
    state: NavState;
    navigation: Nav;
    isDragging: SharedValue<number>;
  }) => {
    const isFocused = state.index === state.routes.findIndex((r: Route) => r.key === route.key);
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    const indicatorStyle = useAnimatedStyle(() => ({
      opacity: withSpring(isDragging.value ? 0 : 1),
      transform: [{ scale: withSpring(isDragging.value ? 0 : 1) }],
    }));

    let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'help';
    const iconColor = isFocused ? '#CCFF00' : 'rgba(255, 255, 255, 0.5)';

    switch (route.name) {
      case 'index':
        iconName = isFocused ? 'home' : 'home-outline';
        break;
      case 'workouts':
        iconName = isFocused ? 'dumbbell' : 'dumbbell';
        break;
      case 'nutrition':
        iconName = isFocused ? 'silverware-fork-knife' : 'silverware-fork-knife';
        break;
      case 'progress':
        iconName = isFocused ? 'chart-line' : 'chart-line-variant';
        break;
      case 'ranking':
        iconName = isFocused ? 'trophy' : 'trophy-outline';
        break;
      case 'students':
        iconName = isFocused ? 'account-group' : 'account-group-outline';
        break;
    }

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
          {isFocused && <Animated.View style={[styles.activeIndicator, indicatorStyle]} />}
        </View>
      </Pressable>
    );
  }
);

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { accountType, isMasquerading } = useAuthStore();
  const _router = useRouter();

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  const sortedRoutes = useMemo(
    () =>
      state.routes
        .filter((r: Route) => {
          if (!routeOrder.includes(r.name)) return false;
          if (accountType === 'specialist' && !isMasquerading) {
            if (r.name === 'progress') return false;
          }
          if (accountType === 'student' || accountType === 'member' || isMasquerading) {
            if (r.name === 'students') return false;
          }
          return true;
        })
        .sort((a: Route, b: Route) => {
          return routeOrder.indexOf(a.name) - routeOrder.indexOf(b.name);
        }),
    [state.routes, accountType, isMasquerading]
  );

  const displayRoutes = sortedRoutes.slice(0, 4);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const activeActionShared = useSharedValue<string | null>(null);

  const navigateToMenu = () => {
    navigation.navigate('menu');
  };

  const isStudent =
    !accountType || accountType === 'student' || accountType === 'member' || isMasquerading;

  const triggerAction = (action: string) => {
    switch (action) {
      case 'workout':
        navigation.navigate('workouts');
        break;
      case 'meal':
        navigation.navigate('nutrition');
        break;
      case 'cardio':
        navigation.navigate('cardio/index'); // This route might not be in tabs, leaving string if it's special, or add to types if it matches structure.
        break;
    }
    activeActionShared.value = null;
  };

  // Optimized Gesture Handler - Single Pan for both interactions to reduce overhead
  const gesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = 1;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      let targetX = event.translationX;
      let targetY = event.translationY;

      // Detect action zones
      let currentAction: string | null = null;

      // Top Half
      if (targetY < -30) {
        if (targetX < 0)
          currentAction = 'workout'; // Top-Left
        else currentAction = 'menu'; // Top-Right
      }
      // Bottom Half (Horizontal)
      else {
        if (targetX < -40)
          currentAction = 'meal'; // Left
        else if (targetX > 40 && isStudent) currentAction = 'cardio'; // Right (Restricted)
      }

      // Haptic Trigger
      if (currentAction !== activeActionShared.value) {
        activeActionShared.value = currentAction;
        if (currentAction) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
      }

      // Magnetic Attraction
      if (currentAction === 'workout') {
        targetX -= 10;
        targetY -= 15;
      } else if (currentAction === 'menu') {
        targetX += 10;
        targetY -= 15;
      } else if (currentAction === 'meal') {
        targetX -= 15;
        targetY += 10;
      } // Keep closer to axis
      else if (currentAction === 'cardio') {
        targetX += 15;
        targetY += 10;
      }

      translateX.value = targetX;
      translateY.value = targetY;
    })
    .onEnd(() => {
      const active = activeActionShared.value;

      if (active === 'workout') {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(triggerAction)('workout');
      } else if (active === 'menu') {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(navigateToMenu)();
      } else if (active === 'meal') {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(triggerAction)('meal');
      } else if (active === 'cardio') {
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(triggerAction)('cardio');
      } else {
        // Fallback or centered tap -> Menu
        const distance = Math.sqrt(translateX.value ** 2 + translateY.value ** 2);
        if (distance < 10) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
          runOnJS(navigateToMenu)();
        }
      }

      translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      activeActionShared.value = null;
    })
    .onFinalize(() => {
      isDragging.value = 0;
    });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: withSpring(isDragging.value ? 1.05 : 1) }, // Reduced scale slightly
      ],
    };
  });

  const tabContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(isDragging.value ? 0.3 : 1, { damping: 20 }),
      transform: [{ scale: withSpring(isDragging.value ? 0.98 : 1) }],
    };
  });

  // 1. Workout Styles (Top Left)
  const workoutIndicatorStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'workout';
    const baseOpacity = withSpring(isDragging.value === 1 ? 1 : 0, { damping: 20 });
    return {
      opacity: isActive ? 1 : baseOpacity,
      backgroundColor: withSpring(isActive ? '#CCFF00' : 'rgba(30, 30, 30, 0.9)'),
      transform: [
        { scale: isActive ? withSpring(1.6) : withSpring(1.0) },
        { translateX: isActive ? -10 : 0 },
        { translateY: isActive ? -10 : 0 },
      ],
      borderWidth: isActive ? 2 : 1,
      borderColor: '#FFFFFF',
      zIndex: isActive ? 999 : 1,
      pointerEvents: isDragging.value ? 'auto' : 'none',
    } as ViewStyle;
  });
  const workoutLabelStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'workout';
    return {
      opacity: withSpring(isActive ? 1 : 0),
      transform: [{ translateY: withSpring(isActive ? -25 : 0) }],
    };
  });

  // 2. Menu Styles (Top Right)
  const menuIndicatorStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'menu';
    const baseOpacity = withSpring(isDragging.value === 1 ? 1 : 0, { damping: 20 });
    return {
      opacity: isActive ? 1 : baseOpacity,
      backgroundColor: withSpring(isActive ? '#FF0099' : 'rgba(30, 30, 30, 0.9)'), // Purple for Menu
      transform: [
        { scale: isActive ? withSpring(1.6) : withSpring(1.0) },
        { translateX: isActive ? 10 : 0 },
        { translateY: isActive ? -10 : 0 },
      ],
      borderWidth: isActive ? 2 : 1,
      borderColor: '#FFFFFF',
      zIndex: isActive ? 999 : 1,
      pointerEvents: isDragging.value ? 'auto' : 'none',
    } as ViewStyle;
  });
  const menuLabelStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'menu';
    return {
      opacity: withSpring(isActive ? 1 : 0),
      transform: [{ translateY: withSpring(isActive ? -25 : 0) }],
    };
  });

  // 3. Meal Styles (Left)
  const mealIndicatorStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'meal';
    const baseOpacity = withSpring(isDragging.value === 1 ? 1 : 0, { damping: 20 });
    return {
      opacity: isActive ? 1 : baseOpacity,
      backgroundColor: withSpring(isActive ? '#A3CC00' : 'rgba(30, 30, 30, 0.9)'),
      transform: [
        { scale: isActive ? withSpring(1.6) : withSpring(1.0) },
        { translateX: isActive ? -15 : 0 },
      ],
      borderWidth: isActive ? 2 : 1,
      borderColor: '#FFFFFF',
      zIndex: isActive ? 999 : 1,
      pointerEvents: isDragging.value ? 'auto' : 'none',
    } as ViewStyle;
  });
  const mealLabelStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'meal';
    return {
      opacity: withSpring(isActive ? 1 : 0),
      transform: [{ translateY: withSpring(isActive ? -25 : 0) }],
    };
  });

  // 4. Cardio Styles (Right)
  const cardioIndicatorStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'cardio';
    const baseOpacity = withSpring(isDragging.value === 1 ? 1 : 0, { damping: 20 });
    return {
      opacity: isActive ? 1 : baseOpacity,
      backgroundColor: withSpring(isActive ? '#00F0FF' : 'rgba(30, 30, 30, 0.9)'),
      transform: [
        { scale: isActive ? withSpring(1.6) : withSpring(1.0) },
        { translateX: isActive ? 15 : 0 },
      ],
      borderWidth: isActive ? 2 : 1,
      borderColor: '#FFFFFF',
      zIndex: isActive ? 999 : 1,
      pointerEvents: isDragging.value ? 'auto' : 'none',
    } as ViewStyle;
  });
  const cardioLabelStyle = useAnimatedStyle(() => {
    const isActive = activeActionShared.value === 'cardio';
    return {
      opacity: withSpring(isActive ? 1 : 0),
      transform: [{ translateY: withSpring(isActive ? -25 : 0) }],
    };
  });

  const renderPlusButton = () => (
    <View key="plus-button" style={styles.centerButtonContainer} pointerEvents="box-none">
      {/* Action Indicators */}
      <View style={{ position: 'absolute' }} pointerEvents="box-none">
        {/* Workout: Top Left (-60, -80) */}
        <Animated.View
          style={[styles.actionIndicator, { top: -80, left: -60 }, workoutIndicatorStyle]}
        >
          <MaterialCommunityIcons name="dumbbell" size={20} color="white" />
          <Animated.Text style={[styles.actionLabel, workoutLabelStyle]}>Treino</Animated.Text>
        </Animated.View>

        {/* Menu: Top Right (60, -80) */}
        <Animated.View
          style={[styles.actionIndicator, { top: -80, right: -60 }, menuIndicatorStyle]}
        >
          <MaterialCommunityIcons name="view-grid" size={20} color="white" />
          <Animated.Text style={[styles.actionLabel, menuLabelStyle]}>Menu</Animated.Text>
        </Animated.View>

        {/* Meal: Left (-100, -10) */}
        <Animated.View
          style={[styles.actionIndicator, { top: -10, left: -100 }, mealIndicatorStyle]}
        >
          <MaterialCommunityIcons name="food-apple" size={20} color="white" />
          <Animated.Text style={[styles.actionLabel, mealLabelStyle]}>Dieta</Animated.Text>
        </Animated.View>

        {/* Cardio: Right (-100, -10) - Only for Students */}
        {isStudent && (
          <Animated.View
            style={[styles.actionIndicator, { top: -10, right: -100 }, cardioIndicatorStyle]}
          >
            <MaterialCommunityIcons name="speedometer" size={20} color="white" />
            <Animated.Text style={[styles.actionLabel, cardioLabelStyle]}>Cardio</Animated.Text>
          </Animated.View>
        )}
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.centerButton, animatedButtonStyle]}>
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.centerButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );

  // @ts-expect-error
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom + 10 },
      ]}
    >
      {/* Background layer */}
      <View style={styles.backgroundContainer}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={45}
            tint="dark"
            style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: 'hidden' }]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 40,
                backgroundColor: 'rgba(24, 24, 27, 0.95)', // Solid Zinc-900/950
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              },
            ]}
          />
        )}
        <Svg width={SCREEN_WIDTH * 0.92} height={TAB_BAR_HEIGHT} style={styles.svgBackground}>
          <Path d={getPath()} fill="rgba(24, 24, 27, 0.45)" />
        </Svg>
      </View>

      {/* Interactive content layer */}
      <Animated.View style={[styles.content, tabContainerStyle]}>
        {displayRoutes.slice(0, 2).map((route) => (
          <TabItem
            key={route.key}
            route={route}
            state={state}
            navigation={navigation}
            isDragging={isDragging}
          />
        ))}
        {renderPlusButton()}

        {displayRoutes.slice(2, 4).map((route) => (
          <TabItem
            key={route.key}
            route={route}
            state={state}
            navigation={navigation}
            isDragging={isDragging}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  backgroundContainer: {
    position: 'absolute',
    width: '92%',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Keep it circular by default
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.solid,
    position: 'absolute',
    bottom: -2,
  },
  centerButtonContainer: {
    width: 68,
    height: 68,
    marginTop: -32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  centerButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionIndicator: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  actionLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 80,
    textAlign: 'center',
  },
  menuInstruction: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  menuInstructionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
