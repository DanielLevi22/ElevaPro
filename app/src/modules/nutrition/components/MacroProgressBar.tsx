import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { colors as brandColors } from '@/constants/colors';

interface MacroProgressBarProps {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  color: string;
}

export function MacroProgressBar({ label, consumed, target, unit, color }: MacroProgressBarProps) {
  const percentage = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const isOver = consumed > target;

  // Map simple color names to brand gradients if needed, or use the passed color
  const getGradient = () => {
    if (color === '#34C759' || color === '#00C9A7') return brandColors.gradients.success;
    if (color === '#FF6B35' || color === '#FFB800') return brandColors.gradients.primary;
    if (color === '#FF2E63' || color === '#FF3B30') return brandColors.gradients.primaryReverse;
    return [color, color];
  };

  return (
    <View className="mb-4">
      {/* Header */}
      <View className="flex-row justify-between items-end mb-2 px-1">
        <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          {label}
        </Text>
        <Text
          className="text-[13px] font-bold font-display"
          style={{ color: isOver ? brandColors.status.error : brandColors.text.primary }}
        >
          {consumed.toFixed(0)}
          {unit}{' '}
          <Text className="text-zinc-500 font-medium">
            / {target.toFixed(0)}
            {unit}
          </Text>
        </Text>
      </View>

      {/* Progress Bar */}
      <View
        className="h-3 bg-zinc-900 rounded-full overflow-hidden border"
        style={{ borderColor: brandColors.border.dark }}
      >
        <LinearGradient
          colors={getGradient() as never}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="h-full rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
