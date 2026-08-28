import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

interface WorkoutShareCardProps {
  title: string;
  duration: string;
  calories: string;
  date: string;
  exerciseName?: string;
}

export function WorkoutShareCard({
  title,
  duration,
  calories,
  date,
  exerciseName,
}: WorkoutShareCardProps) {
  return (
    <View className="w-[350px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl">
      <LinearGradient
        colors={['#CCFF00', '#A3CC00', '#0A0A0A']}
        locations={[0, 0.4, 0.8]}
        className="flex-1 p-8 justify-between"
      >
        {/* Header */}
        <View className="mt-8">
          <View className="flex-row items-center space-x-2 mb-2">
            <Ionicons name="flame" size={32} color="white" />
            <Text className="text-white font-bold text-xl font-display tracking-wider">
              ELEVA PRO
            </Text>
          </View>
          <Text className="text-white/80 font-sans text-sm uppercase tracking-widest">{date}</Text>
        </View>

        {/* Main Stats */}
        <View className="items-center">
          <Text className="text-white font-black text-5xl font-display text-center mb-2 shadow-sm">
            {title.toUpperCase()}
          </Text>
          {exerciseName && (
            <Text className="text-white/90 font-bold text-2xl font-sans text-center bg-white/20 px-4 py-1 rounded-full overflow-hidden">
              {exerciseName}
            </Text>
          )}
        </View>

        {/* Detailed Stats */}
        <View className="flex-row justify-between bg-black/30 p-6 rounded-2xl backdrop-blur-md border border-white/10">
          <View className="items-center flex-1 border-r border-white/10">
            <Ionicons name="time-outline" size={32} color="#CCFF00" className="mb-2" />
            <Text className="text-white font-bold text-2xl font-display">{duration}</Text>
            <Text className="text-zinc-400 text-xs uppercase font-bold">Duração</Text>
          </View>

          <View className="items-center flex-1">
            <Ionicons name="bonfire-outline" size={32} color="#A3CC00" className="mb-2" />
            <Text className="text-white font-bold text-2xl font-display">{calories}</Text>
            <Text className="text-zinc-400 text-xs uppercase font-bold">Calorias</Text>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mb-8">
          <Text className="text-white/60 font-sans text-sm">Superando limites todos os dias.</Text>
          <View className="h-1 w-12 bg-white/20 rounded-full mt-4" />
        </View>
      </LinearGradient>
    </View>
  );
}
