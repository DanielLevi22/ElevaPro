import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import type { MealCookingStep } from '../services/mealRecipes';

/** Timer usa o relógio real para sobreviver à suspensão do JS. @example useCookingSteps(preparation.steps) */
export function useCookingSteps(steps: readonly MealCookingStep[]) {
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(steps[0]?.timerSeconds ?? 0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const voiceVersion = useRef(0);

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) setDeadline(null);
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  useEffect(
    () => () => {
      voiceVersion.current += 1;
      void Speech.stop();
    },
    []
  );

  const stopVoice = () => {
    voiceVersion.current += 1;
    void Speech.stop();
    setSpeaking(false);
  };
  const goTo = (nextIndex: number) => {
    stopVoice();
    setIndex(nextIndex);
    setDeadline(null);
    setSecondsLeft(steps[nextIndex]?.timerSeconds ?? 0);
  };
  const speak = () => {
    if (speaking) return stopVoice();
    const version = ++voiceVersion.current;
    const finish = () => {
      if (voiceVersion.current === version) setSpeaking(false);
    };
    setSpeaking(true);
    Speech.speak(steps[index].instruction, {
      language: 'pt-BR',
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  };

  return {
    index,
    step: steps[index],
    last: index === steps.length - 1,
    secondsLeft,
    running: deadline !== null,
    speaking,
    next: () => goTo(Math.min(index + 1, steps.length - 1)),
    previous: () => goTo(Math.max(index - 1, 0)),
    stopVoice,
    speak,
    toggleTimer: () => {
      if (deadline !== null) setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      setDeadline(deadline !== null || secondsLeft === 0 ? null : Date.now() + secondsLeft * 1000);
    },
    resetTimer: () => {
      setDeadline(null);
      setSecondsLeft(steps[index]?.timerSeconds ?? 0);
    },
  };
}
