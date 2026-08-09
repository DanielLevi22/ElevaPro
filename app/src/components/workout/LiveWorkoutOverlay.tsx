import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LiveWorkoutOverlayProps {
  visible: boolean;
  timeLeft: number;
  totalTime: number;
  onClose: () => void;
  onAdd10s: () => void;
  onSubtract10s: () => void;
  onSkip: () => void;
}

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.7;

export function LiveWorkoutOverlay({
  visible,
  timeLeft,
  totalTime,
  onClose,
  onAdd10s,
  onSubtract10s,
  onSkip,
}: LiveWorkoutOverlayProps) {
  // Calculate progress for circle (simplified visual)
  const _progress = totalTime > 0 ? timeLeft / totalTime : 0;

  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Dark background with blur effect if possible */}
        <View style={styles.backdrop} />

        <View style={styles.content}>
          <Text style={styles.title}>Descanso</Text>

          {/* Timer Circle */}
          <View style={styles.timerContainer}>
            <LinearGradient colors={['#FF6B35', '#E85A2A']} style={styles.circleBorder}>
              <View style={styles.circleInner}>
                <Text style={styles.timerText}>{timeLeft}</Text>
                <Text style={styles.secondsText}>segundos</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={onSubtract10s} style={styles.controlButton}>
              <Text style={styles.controlText}>-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <LinearGradient colors={['#00FF88', '#00CC6E']} style={styles.skipButtonGradient}>
                <Text style={styles.skipText}>Pular Descanso</Text>
                <Ionicons name="play" size={20} color="#09090B" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onAdd10s} style={styles.controlButton}>
              <Text style={styles.controlText}>+10s</Text>
            </TouchableOpacity>
          </View>

          {/* Tip */}
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#8B92A8" />
            <Text style={styles.tipText}>Respire fundo e prepare-se para a próxima série.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    // RN 0.86 removeu StyleSheet.absoluteFillObject; absoluteFill cobre o
    // mesmo caso e pode ser espalhado do mesmo jeito.
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 14, 26, 0.95)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  timerContainer: {
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBorder: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    padding: 4, // Border width
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: '100%',
    height: '100%',
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  secondsText: {
    fontSize: 18,
    color: '#8B92A8',
    marginTop: -10,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    marginBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  controlText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  skipButton: {
    flex: 1,
    maxWidth: 200,
    height: 60,
    borderRadius: 30,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButtonGradient: {
    flex: 1,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skipText: {
    color: '#09090B',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  tipText: {
    color: '#8B92A8',
    fontSize: 14,
    textAlign: 'center',
  },
});
