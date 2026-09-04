import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTES } from '../types';

/**
 * Regressão: rota da Análise de Técnica apontando para arquivo inexistente.
 *
 * `ROUTES.TECHNIQUE.ROOT` era `/tecnica/index` — nome que o typegen do Expo
 * Router emitiu para `tecnica/index.tsx` e que o roteador não serve. Compilava,
 * passava no lint, passava no `check-navigation-casts` (não havia cast nenhum),
 * e dava "tela não encontrada" ao tocar no card da Home. Nada além de abrir o
 * app pegava isso.
 *
 * O teste fecha a distância entre a constante e o sistema de arquivos, que é
 * onde o Expo Router decide de verdade o que existe.
 *
 * Escopo proposital nas rotas da técnica: a tabela inteira tem entradas
 * dinâmicas e grupos que pedem outras regras de resolução. Estender vale, mas é
 * outro trabalho — e teste que precisa de exceções para passar já não afirma o
 * que diz afirmar.
 */

const RAIZ_DO_ROTEADOR = join(__dirname, '..', '..', 'app');

/** Como o Expo Router resolve um href: arquivo direto, ou índice da pasta. */
function existeRota(href: string): boolean {
  const relativo = href.replace(/^\//, '');
  return [
    `${relativo}.tsx`,
    `${relativo}.ts`,
    join(relativo, 'index.tsx'),
    join(relativo, 'index.ts'),
  ].some((candidato) => existsSync(join(RAIZ_DO_ROTEADOR, candidato)));
}

describe('rotas da Análise de Técnica', () => {
  it.each(Object.entries(ROUTES.TECHNIQUE))('%s aponta para uma tela que existe', (nome, href) => {
    if (!existeRota(href)) {
      throw new Error(
        `ROTA MORTA: ROUTES.TECHNIQUE.${nome} vale "${href}", e não há arquivo em src/app para servi-lo — o toque cai em "tela não encontrada"`
      );
    }
  });

  // A prova de que o teste sabe falhar. Sem ela, um `existeRota` que devolvesse
  // sempre `true` passaria despercebido e a trava seria decoração.
  it('acusa rota que não existe', () => {
    expect(existeRota('/tecnica/supino')).toBe(false);
  });
});
