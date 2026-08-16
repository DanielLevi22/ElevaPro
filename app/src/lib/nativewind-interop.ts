import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

/**
 * Ensina o NativeWind a estilizar componentes de terceiros.
 *
 * O `className` só funciona nos componentes do próprio React Native. Num
 * componente de biblioteca — `LinearGradient`, `Image` do expo-image — ele
 * chega como uma prop desconhecida e é **descartado em silêncio**: sem erro,
 * sem aviso, sem nada no console.
 *
 * O resultado é o botão perdendo padding, cantos arredondados e centralização
 * de uma vez só, e virando um retângulo colado nas bordas com o texto à
 * esquerda. Como o gradiente continua pintando, parece um problema de layout
 * pontual em vez do que é: a classe inteira sendo ignorada.
 *
 * Havia 86 `<LinearGradient className="...">` no app quando isto foi escrito —
 * era todo botão de destaque de todas as telas.
 *
 * Precisa rodar **uma vez, antes de qualquer tela montar**, por isso é
 * importado no topo de `app/_layout.tsx`.
 *
 * @example
 * // depois desta linha, isto passa a funcionar:
 * <LinearGradient className="py-4 rounded-2xl items-center" colors={[a, b]} />
 */
cssInterop(LinearGradient, { className: 'style' });
cssInterop(Image, { className: 'style' });
