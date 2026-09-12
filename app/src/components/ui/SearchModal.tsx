import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Modal, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { useCores } from '@/shared/design';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchModal({
  visible,
  onClose,
  value,
  onChangeText,
  placeholder = 'Buscar...',
}: SearchModalProps) {
  const cores = useCores();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Small delay to ensure modal is rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="flex-1 bg-black/60 backdrop-blur-sm"
        >
          {/* Content Wrapper to avoid closing when clicking inside */}
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInUp.duration(300)}
              exiting={SlideOutDown.duration(300)}
              className="pt-16 px-6 pb-6 bg-card rounded-b-3xl border-b border-border shadow-2xl shadow-black"
            >
              <View className="flex-row items-center gap-4">
                <View className="flex-1 flex-row items-center bg-muted rounded-2xl px-4 py-3 border border-border">
                  <Ionicons name="search" size={20} color={cores.mutedForeground} />
                  <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={cores.placeholder}
                    className="flex-1 ml-3 text-foreground text-base font-sans"
                    returnKeyType="search"
                  />
                  {value.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeText('')}>
                      <Ionicons name="close-circle" size={20} color={cores.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  className="w-10 h-10 items-center justify-center rounded-xl bg-muted"
                >
                  <Ionicons name="close" size={24} color={cores.foreground} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
