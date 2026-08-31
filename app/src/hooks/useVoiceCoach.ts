import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

export const useVoiceCoach = () => {
  const [isMuted, setIsMuted] = useState(false);

  const [lastInstruction, setLastInstruction] = useState<string>('');

  /**
   * @param aoTerminar chamado quando a fala acaba, ou na hora quando está mudo.
   *
   * Existe porque `Speech.speak` retorna assim que enfileira: quem precisa agir
   * DEPOIS da frase — uma contagem que não pode correr por cima dela — não
   * tinha como saber. Um `speak` sem fim é meia operação.
   */
  const speak = (text: string, priority = false, aoTerminar?: () => void) => {
    if (isMuted) {
      aoTerminar?.();
      return;
    }

    if (priority) {
      Speech.stop();
    }

    setLastInstruction(text); // Memorize for repetition
    Speech.speak(text, {
      language: 'pt-BR',
      pitch: 1.0,
      rate: 0.9,
      onDone: aoTerminar,
      onStopped: aoTerminar,
      onError: aoTerminar,
    });
  };

  const repeatLastInstruction = () => {
    if (lastInstruction) {
      speak(lastInstruction, true);
    } else {
      speak('Ainda não tenho instruções para repetir.');
    }
  };

  const announceExercise = (
    name: string,
    sets: number,
    reps: string | number,
    weight?: string | number
  ) => {
    const w = weight ? `com ${weight} quilos` : '';
    speak(`Próximo exercício: ${name}. ${sets} séries de ${reps} repetições ${w}.`);
  };

  const announceSetStart = (setNumber: number, reps: string | number, weight?: string | number) => {
    const w = weight ? `com ${weight} quilos` : '';
    speak(
      `Vamos para a ${setNumber}ª série. ${reps} repetições ${w}. Prepare-se... Valendo!`,
      true
    );
  };

  const announceRest = (seconds: number) => {
    speak(`Descanso de ${seconds} segundos iniciado. Respire e recupere o fôlego.`);
  };

  const announceFinish = () => {
    speak('Treino finalizado. Excelente trabalho! Não esqueça de se hidratar.');
  };

  const announceResume = () => {
    speak('Voltando ao treino. Vamos lá!');
  };

  const toggleMute = () => {
    if (!isMuted) {
      Speech.stop();
    } else {
      Speech.speak('Voz ativada.');
    }
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return {
    isMuted,
    toggleMute,
    speak,
    repeatLastInstruction,
    announceExercise,
    announceSetStart,
    announceRest,
    announceFinish,
    announceResume,
  };
};
