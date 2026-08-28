import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { VideoPlayer } from '@/components/VideoPlayer';
import { MUSCLE_IMAGES } from '../constants';
import type { ProgressionAnalysis, WorkoutItem } from '../types';
import { ProgressionBadge } from './ProgressionBadge';

interface WorkoutExerciseCardProps {
  item: WorkoutItem;
  effectiveItem: WorkoutItem;
  isEdited: boolean;
  completed: number;
  isCompleted: boolean;
  isResting: boolean;
  progressionAnalysis?: ProgressionAnalysis;
  onEdit: (item: WorkoutItem) => void;
  onLogSet: (item: WorkoutItem) => void;
  itemIndex: number;
}

export const WorkoutExerciseCard = React.memo(function WorkoutExerciseCard({
  item,
  effectiveItem,
  isEdited,
  completed,
  isCompleted,
  isResting,
  progressionAnalysis,
  onEdit,
  onLogSet,
  itemIndex,
}: WorkoutExerciseCardProps) {
  const muscleGroup = item.exercise?.muscle_group || 'Geral';
  // biome-ignore lint/complexity/useLiteralKeys: auto-suppressed during final sweep
  const bgImage = MUSCLE_IMAGES[muscleGroup] || MUSCLE_IMAGES['Geral'];

  return (
    <Animated.View entering={FadeInDown.delay(itemIndex * 100).duration(500)} className="mb-5">
      <View className="rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-900">
        <Image
          source={bgImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={1000}
        />
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']} className="p-5">
          {/* Header with Exercise Name and Edit Button */}
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                  <Text className="text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                    {muscleGroup}
                  </Text>
                </View>
                {isEdited && (
                  <View className="bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/40">
                    <Text className="text-blue-400 text-[8px] font-black uppercase tracking-widest">
                      Editado
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-white text-xl font-black font-display uppercase tracking-tight drop-shadow-lg">
                {item.exercise?.name || 'Exercício'}
              </Text>
            </View>
            {isCompleted ? (
              <View className="bg-emerald-500 w-10 h-10 rounded-xl items-center justify-center shadow-lg">
                <Ionicons name="checkmark" size={20} color="white" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => onEdit(item)}
                className="bg-white/10 w-10 h-10 rounded-xl items-center justify-center border border-white/20 backdrop-blur-md"
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Video Player */}
          {item.exercise?.video_url && (
            <View className="mb-4">
              <VideoPlayer videoUrl={item.exercise.video_url} height={180} autoPlay={false} />
            </View>
          )}

          {/* Stats with Icons */}
          <View className="flex-row items-center gap-2 mb-4 flex-wrap">
            <View className="flex-row items-center bg-white/10 px-3 py-2 rounded-lg border border-white/5">
              <Ionicons
                name="repeat-outline"
                size={14}
                color="#FF6B35"
                style={{ marginRight: 6 }}
              />
              <Text className={`text-xs font-bold ${isEdited ? 'text-blue-400' : 'text-zinc-200'}`}>
                {effectiveItem.sets} x {effectiveItem.reps}
              </Text>
            </View>

            <View className="flex-row items-center bg-white/10 px-3 py-2 rounded-lg border border-white/5">
              <Ionicons name="timer-outline" size={14} color="#FF6B35" style={{ marginRight: 6 }} />
              <Text className={`text-xs font-bold ${isEdited ? 'text-blue-400' : 'text-zinc-200'}`}>
                {effectiveItem.rest_seconds}s
              </Text>
            </View>

            {effectiveItem.weight && (
              <View className="flex-row items-center bg-white/10 px-3 py-2 rounded-lg border border-white/5">
                <Ionicons
                  name="barbell-outline"
                  size={14}
                  color="#FF6B35"
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-xs font-bold ${isEdited ? 'text-blue-400' : 'text-zinc-200'}`}
                >
                  {effectiveItem.weight}kg
                </Text>
              </View>
            )}

            {/* Progression Badges */}
            {progressionAnalysis?.weight && (
              <ProgressionBadge
                type={progressionAnalysis.weight.type}
                value={progressionAnalysis.weight.diff}
                metric="weight"
              />
            )}

            {progressionAnalysis?.sets && (
              <ProgressionBadge
                type={progressionAnalysis.sets.type}
                value={`${progressionAnalysis.sets.diff} séries`}
                metric="sets"
              />
            )}
          </View>

          {/* Progress Bar and Check Button */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-12 bg-black/40 rounded-xl overflow-hidden border border-white/10">
              <View
                className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`}
                style={{ width: `${(completed / (effectiveItem.sets ?? 1)) * 100}%` }}
              />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-white font-black text-[10px] uppercase tracking-widest drop-shadow">
                  {completed} / {effectiveItem.sets ?? 0} CONCLUÍDOS
                </Text>
              </View>
            </View>

            {!isCompleted && (
              <TouchableOpacity
                onPress={() => onLogSet(item)}
                activeOpacity={isResting ? 1 : 0.7}
                disabled={isResting}
              >
                <LinearGradient
                  colors={isResting ? ['#27272A', '#18181B'] : ['#FF6B35', '#FF2E63']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className={`h-12 px-6 rounded-xl flex-row items-center justify-center ${isResting ? 'opacity-50' : 'shadow-lg shadow-orange-500/30'}`}
                >
                  <Text className="text-white font-black text-xs uppercase tracking-widest">
                    {isResting ? 'Aguarde' : 'Check'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
});
