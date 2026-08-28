import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DayOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  canPaste: boolean;
  dayName: string;
}

export function DayOptionsModal({
  visible,
  onClose,
  onCopy,
  onPaste,
  onClear,
  canPaste,
  dayName,
}: DayOptionsModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Opções para {dayName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#8B92A8" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={onCopy}>
              <View style={styles.iconContainer}>
                <Ionicons name="copy-outline" size={24} color="#00FF88" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>Copiar Dia</Text>
                <Text style={styles.optionDescription}>Copiar todas as refeições deste dia</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, !canPaste && styles.disabledButton]}
              onPress={onPaste}
              disabled={!canPaste}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name="clipboard-outline"
                  size={24}
                  color={canPaste ? '#00D9FF' : '#52525B'}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, !canPaste && styles.disabledText]}>
                  Colar Dia
                </Text>
                <Text style={styles.optionDescription}>
                  {canPaste
                    ? 'Substituir refeições pelo dia copiado'
                    : 'Copie um dia primeiro para colar'}
                </Text>
              </View>
              {canPaste && <Ionicons name="chevron-forward" size={20} color="#52525B" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={onClear}>
              <View style={styles.iconContainer}>
                <Ionicons name="trash-outline" size={24} color="#FF6B35" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, { color: '#FF6B35' }]}>Limpar Dia</Text>
                <Text style={styles.optionDescription}>Remover todas as refeições deste dia</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525B" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'GeneralSans-Bold',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B', // Zinc 950
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: '#27272A', // Zinc 800
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#18181B', // Zinc 900
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'GeneralSans-Semibold',
  },
  disabledText: {
    color: '#52525B', // Zinc 600
  },
  optionDescription: {
    fontSize: 12,
    color: '#A1A1AA', // Zinc 400
    fontFamily: 'GeneralSans-Regular',
  },
});
