import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import ViewShot, { captureRef, type ViewShotRef } from 'react-native-view-shot';
import { WorkoutShareCard } from './WorkoutShareCard';

interface ShareWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  stats: {
    title: string;
    duration: string;
    calories: string;
    date: string;
    exerciseName?: string;
  };
}

export function ShareWorkoutModal({ visible, onClose, stats }: ShareWorkoutModalProps) {
  const viewShotRef = useRef<ViewShotRef>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (!(await Sharing.isAvailableAsync())) {
        alert('O compartilhamento não está disponível neste dispositivo.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar Treino',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Error sharing workout:', error);
      alert('Erro ao compartilhar. Tente novamente.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/90 justify-center items-center p-4">
        <View className="w-full max-w-sm items-center">
          <Text className="text-white font-bold text-2xl mb-6 font-display">
            Compartilhe sua conquista! 🚀
          </Text>

          {/* The Card to Capture */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0 }}
            style={{ borderRadius: 24, overflow: 'hidden', elevation: 10 }}
          >
            <WorkoutShareCard {...stats} />
          </ViewShot>

          {/* Actions */}
          <View className="flex-row mt-8 space-x-4 w-full justify-center">
            <TouchableOpacity
              onPress={onClose}
              className="bg-zinc-800 px-6 py-4 rounded-xl flex-1 items-center"
            >
              <Text className="text-white font-bold">Fechar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing}
              className="bg-[#CCFF00] px-6 py-4 rounded-xl flex-1 items-center flex-row justify-center space-x-2"
            >
              {isSharing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="share-social" size={20} color="white" />
                  <Text className="text-white font-bold">Compartilhar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
