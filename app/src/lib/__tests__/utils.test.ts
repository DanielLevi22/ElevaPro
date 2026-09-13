import { cn } from '../utils';

/**
 * O `cn` precisa conhecer a escala de texto do projeto.
 *
 * Sem ela, o `tailwind-merge` lê `text-h2` como **cor** — não é tamanho que ele
 * conheça — e, ao juntar com `text-sobre-imagem`, descarta um dos dois. Foi o
 * que deixou o título do cartão do treino escuro sobre a foto no tema claro, e
 * o `Button` e a ofensiva sem o tamanho de fonte.
 */
describe('cn', () => {
  it('mantém tamanho da escala e cor juntos', () => {
    expect(cn('font-bold text-sobre-imagem', 'text-h2')).toBe(
      'font-bold text-sobre-imagem text-h2'
    );
    expect(cn('text-rotulo', 'text-primary-foreground')).toBe(
      'text-rotulo text-primary-foreground'
    );
  });

  it('entre dois tamanhos da escala, fica o último', () => {
    expect(cn('text-micro', 'text-h2')).toBe('text-h2');
  });

  it('entre duas cores, fica a última', () => {
    expect(cn('text-hero', 'text-secondary')).toBe('text-secondary');
  });
});
