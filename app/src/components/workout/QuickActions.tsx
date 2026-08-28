import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface QuickActionsProps {
  onDownload: () => void;
  onStudentView: () => void;
  onEvolution: () => void;
}

export function QuickActions({ onDownload, onStudentView, onEvolution }: QuickActionsProps) {
  const actions = [
    {
      id: 'download',
      label: 'Baixar\ntreino',
      icon: 'download-outline',
      onPress: onDownload,
    },
    {
      id: 'student-view',
      label: 'Visão do\naluno',
      icon: 'eye-outline',
      onPress: onStudentView,
    },
    {
      id: 'evolution',
      label: 'Evolução\nGeral',
      icon: 'stats-chart-outline',
      onPress: onEvolution,
    },
  ];

  return (
    <View className="flex-row justify-between px-4 py-2">
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          onPress={action.onPress}
          activeOpacity={0.7}
          className="items-center w-[30%]"
        >
          <View className="mb-2">
            <View
              className="w-16 h-16 rounded-full items-center justify-center border border-zinc-800 bg-zinc-900 shadow-sm"
              style={{
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                borderColor: 'rgba(0, 217, 255, 0.3)',
              }}
            >
              <Ionicons
                name={action.icon as keyof typeof Ionicons.glyphMap}
                size={26}
                color="#00D9FF"
              />
            </View>
          </View>
          <Text className="text-zinc-400 text-[11px] font-bold text-center leading-4 font-sans max-w-[80px]">
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
