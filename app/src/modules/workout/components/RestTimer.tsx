import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

interface RestTimerProps {
  restSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function RestTimer({ restSeconds, onComplete, autoStart = false }: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(restSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // TODO: som de alarme ao fim do descanso. O andaime anterior usava expo-av,
  // que foi removido: o pacote está descontinuado e sua biblioteca nativa
  // derrubava o app no boot com UnsatisfiedLinkError no RN 0.86, procurando um
  // símbolo JSI que não existe mais. O sucessor é `expo-audio`.

  // Timer logic
  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-suppressed during final sweep
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const handleTimerComplete = async () => {
    setIsRunning(false);

    // Vibrate
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Error with haptics:', error);
    }

    // Call completion callback
    if (onComplete) {
      onComplete();
    }
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(restSeconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timeRemaining / restSeconds;
  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View className="items-center py-6">
      {/* Circular Progress */}
      <View className="relative mb-6">
        <Svg width={200} height={200}>
          {/* Background circle */}
          <Circle cx={100} cy={100} r={90} stroke="#27272A" strokeWidth={12} fill="none" />
          {/* Progress circle */}
          <Circle
            cx={100}
            cy={100}
            r={90}
            stroke={timeRemaining === 0 ? '#00C9A7' : '#F97316'}
            strokeWidth={12}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 100 100)`}
          />
        </Svg>

        {/* Time display */}
        <View className="absolute inset-0 justify-center items-center">
          <Text
            className="text-5xl font-extrabold"
            style={{ color: timeRemaining === 0 ? '#00C9A7' : '#FAFAFA' }}
          >
            {formatTime(timeRemaining)}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1">
            {timeRemaining === 0 ? 'Concluído!' : 'Descanso'}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row gap-4">
        <TouchableOpacity
          onPress={handleStartPause}
          className={`py-4 px-8 rounded-2xl flex-row items-center gap-2 ${isRunning ? 'bg-orange-500' : 'bg-primary'}`}
        >
          <Ionicons name={isRunning ? 'pause' : 'play'} size={20} color="#09090B" />
          <Text className="text-primary-foreground text-base font-bold">
            {isRunning ? 'Pausar' : 'Iniciar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReset}
          className="bg-card py-4 px-6 rounded-2xl border-2 border-border"
        >
          <Ionicons name="refresh" size={20} color="#FAFAFA" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
