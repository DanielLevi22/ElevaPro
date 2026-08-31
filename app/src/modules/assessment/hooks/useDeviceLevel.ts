import { DeviceMotion } from 'expo-sensors';
import { useEffect, useState } from 'react';

/** Quanto o aparelho pode desviar da vertical e ainda valer, em graus. */
const TOLERANCIA_GRAUS = 6;

const RAD_PARA_GRAUS = 180 / Math.PI;

export interface DeviceLevel {
  /** Inclinação frente/trás em graus. 0 é perfeitamente vertical. */
  pitch: number;
  /**
   * Torção no eixo da lente, em graus. 0 é o horizonte da imagem na horizontal.
   *
   * É o que contamina a inclinação de ombro e quadril: a imagem inteira gira
   * junto com o aparelho, então uma linha de ombros nivelada aparece torta pelo
   * mesmo tanto.
   */
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
 * acontece (`ADR-0010`).
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
      subscription = DeviceMotion.addListener(({ accelerationIncludingGravity }) => {
        const g = accelerationIncludingGravity;
        if (!g) return;

        // O `rotation` do DeviceMotion — usado antes — só existe em aparelho
        // com GIROSCÓPIO. Sem ele o listener caía fora e `disponivel` ficava
        // `false` para sempre: a checagem de nível do portão era pulada e
        // `framing_level_sensor` gravava `false` em todo scan. O aparelho de
        // teste não tem giroscópio, e a trava esteve inerte desde que nasceu.
        //
        // A gravidade resolve com o acelerômetro, que todo aparelho tem. E é o
        // vetor certo para esta pergunta: o que interessa não é a atitude do
        // aparelho no mundo, é para onde aponta o "para baixo" DENTRO da
        // imagem — que é exatamente a direção da gravidade projetada na tela.
        //
        // Com o aparelho em pé e a tela voltada para o aluno, a gravidade fica
        // em -y. Torcer o aparelho no eixo da lente joga gravidade para x;
        // deitá-lo para frente ou para trás joga para z.
        const roll = Math.atan2(g.x, -g.y) * RAD_PARA_GRAUS;
        const pitch = Math.atan2(g.z, Math.hypot(g.x, g.y)) * RAD_PARA_GRAUS;

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
