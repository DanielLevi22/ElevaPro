import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

/**
 * Torção máxima no eixo da lente. Apertado de propósito.
 *
 * Roll entra 1:1 na inclinação de ombro e quadril: a imagem inteira gira junto
 * com o aparelho, então a torção vira desnível aparente na mesma medida. E o
 * sinal real é dessa ordem — 0,6° a 2,3° nos scans do aparelho de teste. Com
 * folga, o resíduo não muda só o valor: muda o LADO reportado, que é o erro que
 * aponta errado com cara de certo.
 *
 * 1,5° e não 3° porque é comprovadamente alcançável: o aparelho apoiado sem
 * nenhum cuidado especial mediu 1,10°. Apertar aqui sai mais barato que
 * corrigir depois — girar o celular um pouco é fácil, e dispensa uma conta cujo
 * sinal ninguém consegue verificar sem experimento.
 */
const ROLL_MAXIMO = 1.5;

/**
 * Inclinação máxima para frente ou para trás.
 *
 * Mais folgada que o roll porque custa outra coisa: pitch encurta o corpo por
 * perspectiva, e a 12° o erro na régua altura→pixel é de 2%. Não gira o
 * horizonte, então não contamina ângulo nenhum.
 *
 * 12° e não 6° porque 6° não é alcançável na prática: um celular apoiado fica
 * naturalmente perto de 9° para trás — medido no aparelho de teste, que ficava
 * barrado por uma tolerância escolhida quando a trava nunca chegava a rodar.
 */
const PITCH_MAXIMO = 12;

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
      const disponivel = await Accelerometer.isAvailableAsync();
      if (cancelado) return;

      if (!disponivel) {
        // Sem sensor não dá para exigir nivelamento: barrar o disparo deixaria
        // o aluno preso numa tela sem saída.
        setLevel({ ...INICIAL, nivelado: true, disponivel: false });
        return;
      }

      Accelerometer.setUpdateInterval(200);
      subscription = Accelerometer.addListener((g) => {
        // `Accelerometer`, e não `DeviceMotion`. O DeviceMotion depende do
        // vetor de rotação, que exige GIROSCÓPIO: no aparelho de teste o
        // `isAvailableAsync` devolvia false, o hook saía antes de assinar e
        // `framing_level_sensor` gravava `false` em todo scan — a checagem de
        // nível do portão esteve inerte desde que nasceu. Acelerômetro todo
        // aparelho tem.
        //
        // E a gravidade é o vetor certo para esta pergunta: o que interessa
        // não é a atitude do aparelho no mundo, é para onde aponta o "para
        // baixo" DENTRO da imagem — a gravidade projetada na tela.
        //
        // Com o aparelho em pé e a tela voltada para o aluno, a gravidade fica
        // em -y. Torcer o aparelho no eixo da lente joga gravidade para x;
        // deitá-lo para frente ou para trás joga para z.
        // `+y` é para CIMA, e é isto que a versão anterior errava. Um
        // acelerômetro em repouso não mede a gravidade: mede a força normal
        // que a segura, que aponta ao contrário. Com o aparelho em pé ele lê
        // `y ≈ +9.8` — conferido no aparelho: (0.17, 9.18, 1.49). Usar `-y`
        // como referência dava roll de 179° com o celular reto, e o portão
        // barrava o disparo para sempre.
        const roll = Math.atan2(-g.x, g.y) * RAD_PARA_GRAUS;
        const pitch = Math.atan2(g.z, Math.hypot(g.x, g.y)) * RAD_PARA_GRAUS;

        setLevel({
          pitch: Number(pitch.toFixed(1)),
          roll: Number(roll.toFixed(1)),
          nivelado: Math.abs(pitch) <= PITCH_MAXIMO && Math.abs(roll) <= ROLL_MAXIMO,
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
