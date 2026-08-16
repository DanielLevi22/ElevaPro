import { DeviceMotion } from 'expo-sensors';
import { useEffect, useState } from 'react';

/** Quanto o aparelho pode desviar da vertical e ainda valer, em graus. */
const TOLERANCIA_GRAUS = 6;

const RAD_PARA_GRAUS = 180 / Math.PI;

export interface DeviceLevel {
  /** Inclinação frente/trás em graus. 0 é perfeitamente vertical. */
  pitch: number;
  /** Rotação lateral em graus. 0 é sem torção. */
  roll: number;
  nivelado: boolean;
  /** Falso quando o aparelho não tem o sensor — aí o guia não pode barrar nada. */
  disponivel: boolean;
}

const INICIAL: DeviceLevel = { pitch: 0, roll: 0, nivelado: false, disponivel: false };

/**
 * Inclinação do aparelho, para o guia de captura poder validar de verdade.
 *
 * A silhueta antiga desenhava um contorno e aceitava a foto de qualquer jeito.
 * Guia que não valida é decoração — e pior, promete uma conferência que não
 * acontece (`ADR-010`).
 *
 * Um aparelho inclinado encurta o corpo na imagem por perspectiva. Como a
 * Fase 7 usa a altura em pixels como régua, inclinação vira erro de escala em
 * todas as medidas derivadas — daí barrar o disparo em vez de só avisar.
 *
 * @example
 * const { nivelado, pitch } = useDeviceLevel();
 * <TouchableOpacity disabled={!nivelado} onPress={tirarFoto} />
 */
export function useDeviceLevel(): DeviceLevel {
  const [level, setLevel] = useState<DeviceLevel>(INICIAL);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    let cancelado = false;

    const iniciar = async () => {
      const disponivel = await DeviceMotion.isAvailableAsync();
      if (cancelado) return;

      if (!disponivel) {
        // Sem sensor não dá para exigir nivelamento: barrar o disparo deixaria
        // o aluno preso numa tela sem saída.
        setLevel({ ...INICIAL, nivelado: true, disponivel: false });
        return;
      }

      DeviceMotion.setUpdateInterval(200);
      subscription = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;

        // `beta` é a rotação no eixo X. Com o aparelho em pé, ela fica perto de
        // ±π/2 — subtrair leva o "vertical" para zero e torna a comparação
        // com a tolerância direta.
        const pitch = Math.abs(rotation.beta * RAD_PARA_GRAUS) - 90;
        const roll = rotation.gamma * RAD_PARA_GRAUS;

        setLevel({
          pitch: Number(pitch.toFixed(1)),
          roll: Number(roll.toFixed(1)),
          nivelado: Math.abs(pitch) <= TOLERANCIA_GRAUS && Math.abs(roll) <= TOLERANCIA_GRAUS,
          disponivel: true,
        });
      });
    };

    iniciar();

    return () => {
      cancelado = true;
      subscription?.remove();
    };
  }, []);

  return level;
}
