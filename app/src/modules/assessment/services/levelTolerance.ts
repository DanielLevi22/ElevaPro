/**
 * Torção e inclinação máximas, separadas porque custam coisas diferentes.
 *
 * Roll gira a imagem inteira e entra 1:1 na inclinação de ombro e quadril. Com
 * o sinal real entre 0,6° e 2,3°, folga aqui não muda só o valor: muda o LADO
 * reportado. 1,5° é apertado e alcançável — o aparelho apoiado sem cuidado
 * mediu 1,10°.
 *
 * Pitch é o oposto: só encurta o corpo por perspectiva, 2% na régua a 12°, e um
 * celular apoiado fica naturalmente perto de 12°. Exigir dele o que se exige do
 * roll trancaria o aluno numa tolerância que a física do apoio não permite.
 */
const ROLL_MAXIMO = 1.5;
const PITCH_MAXIMO = 12;

/**
 * O aparelho está no nível que o portão aceita? Exportado para os chips da câmera
 * e a checagem da grade dizerem o mesmo que o portão decide (#316).
 *
 * @example levelWithinTolerance(9, 1.1) // true
 */
export function levelWithinTolerance(pitch: number, roll: number): boolean {
  return Math.abs(pitch) <= PITCH_MAXIMO && Math.abs(roll) <= ROLL_MAXIMO;
}
