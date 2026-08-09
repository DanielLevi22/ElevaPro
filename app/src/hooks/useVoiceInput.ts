import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useState } from 'react';
import type { VoiceAction } from '@/modules/workout';

interface UseVoiceInputProps {
  onCommand?: (action: VoiceAction) => void;
  continuous?: boolean;
}

/** Palavras que disparam cada ação, em pt-BR. Ordem importa: a primeira que casar vence. */
const COMMAND_PATTERNS: ReadonlyArray<{ action: VoiceAction; terms: readonly string[] }> = [
  { action: 'next_set', terms: ['próxima', 'proxima', 'feito', 'concluído'] },
  { action: 'finish_workout', terms: ['terminar treino', 'finalizar', 'acabei'] },
  { action: 'pause_timer', terms: ['pausar', 'pause'] },
  { action: 'resume_timer', terms: ['retomar', 'voltar'] },
  { action: 'repeat_instruction', terms: ['repetir', 'entendi', 'instrução'] },
];

function parseCommand(text: string): VoiceAction | null {
  const normalized = text.toLowerCase();
  return (
    COMMAND_PATTERNS.find(({ terms }) => terms.some((t) => normalized.includes(t)))?.action ?? null
  );
}

/**
 * Comandos de voz durante a execução do treino.
 *
 * Usa `expo-speech-recognition`. O `@react-native-voice/voice` anterior era
 * incompatível com o toolchain atual — `jcenter()` removido no Gradle 9, sem
 * `namespace`, e `compileSdk` caindo no default 28 que o AGP 8 rejeita.
 *
 * @example
 * const { isRecording, startListening } = useVoiceInput({ onCommand: handleAction });
 */
export const useVoiceInput = ({ onCommand, continuous = false }: UseVoiceInputProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);

  useSpeechRecognitionEvent('start', () => setIsRecording(true));
  useSpeechRecognitionEvent('end', () => setIsRecording(false));
  useSpeechRecognitionEvent('error', () => setIsRecording(false));

  useSpeechRecognitionEvent('result', (event) => {
    // Resultados parciais chegam antes do final; só agimos no definitivo para
    // não disparar a mesma ação duas vezes.
    if (!event.isFinal) return;

    const action = parseCommand(event.results[0]?.transcript ?? '');
    if (action) onCommand?.(action);
  });

  const startListening = useCallback(async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) return;

      ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: false, continuous });
    } catch (error) {
      console.log('[VoiceInput] Falha ao iniciar reconhecimento:', String(error));
    }
  }, [continuous]);

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.log('[VoiceInput] Falha ao parar reconhecimento:', String(error));
    }
  }, []);

  return { isRecording, isProcessing: false, startListening, stopListening };
};
