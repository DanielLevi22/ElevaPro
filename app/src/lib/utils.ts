import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * A escala de texto do `tailwind.config.js`, ensinada ao `tailwind-merge`.
 *
 * Sem ela, `text-h2` não é tamanho que ele conheça e vira **cor**: juntado com
 * `text-sobre-imagem`, um dos dois some. Foi o que apagou o título do cartão do
 * treino no tema claro. Os nomes precisam acompanhar o `fontSize` do config.
 */
const juntar = extendTailwindMerge({
  extend: {
    theme: {
      text: ['micro', 'legenda', 'rotulo', 'corpo', 'h2', 'h1', 'numero', 'display'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return juntar(clsx(inputs));
}
