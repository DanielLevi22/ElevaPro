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
const MAX_ROLL = 1.5;

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
const MAX_PITCH = 12;

/**
 * O aparelho está no nível que o portão aceita? Uma regra só para o portão, o
 * sensor, os chips da câmera e a checagem da grade (#316).
 *
 * Pitch e roll separados porque custam coisas diferentes: roll gira a imagem e
 * entra 1:1 na inclinação de ombro e quadril; pitch só encurta o corpo por
 * perspectiva.
 *
 * @example levelWithinTolerance(9, 1.1) // true
 */
export function levelWithinTolerance(pitch: number, roll: number): boolean {
  return Math.abs(pitch) <= MAX_PITCH && Math.abs(roll) <= MAX_ROLL;
}
