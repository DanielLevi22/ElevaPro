import { metrica, paleta, type Tema } from './tokens';

/**
 * Monta o conteúdo de `src/global.css` a partir dos tokens.
 *
 * Existe para que o arquivo que o NativeWind lê e os valores que `useCores`
 * entrega sejam a mesma coisa por construção. `tokens.test.ts` compara o
 * arquivo em disco com o que esta função devolve e falha quando os dois andam
 * separados — que é como o app ficou coral com o token certo ao lado.
 *
 * Para regerar depois de mexer nos tokens:
 * `npx jest tokens --testPathPattern=design` mostra a diferença exata.
 */

/**
 * O `react-native-css-interop` só reconhece dois seletores de variável:
 * `:root` para a base e `.dark:root` para o escuro. Um bloco `.light` é
 * ignorado em silêncio — foi por isso que o tema claro nunca valeu no app,
 * apesar de estar declarado. A convenção do design é a inversa (`:root`
 * escuro, `.light` claro): o que atravessa é o **valor**, nunca o seletor.
 */
const SELETOR_POR_TEMA: Record<Tema, string> = {
  claro: ':root',
  escuro: '.dark:root',
};

const CABECALHO = `/* Gerado a partir de src/shared/design/tokens.ts — não editar à mão.
   Quem manda é o módulo de tokens; este arquivo é a saída que o NativeWind lê.
   tokens.test.ts falha se os dois divergirem. */
/* biome-ignore lint/suspicious/noUnknownAtRules: tailwind CSS */
@tailwind base;
/* biome-ignore lint/suspicious/noUnknownAtRules: tailwind CSS */
@tailwind components;
/* biome-ignore lint/suspicious/noUnknownAtRules: tailwind CSS */
@tailwind utilities;`;

export function gerarGlobalCss(): string {
  const blocos = (Object.keys(SELETOR_POR_TEMA) as Tema[]).map(blocoDoTema);
  return `${CABECALHO}\n\n@layer base {\n${blocoDeMetrica()}\n\n${blocos.join('\n\n')}\n}\n`;
}

/**
 * Cor de métrica não muda com o tema: verde é passos no claro e no escuro.
 * Sai num `:root` sozinho, como a marca faria, e não se repete no bloco do
 * escuro — repetir valor igual nos dois temas é convidar os dois a divergirem.
 */
function blocoDeMetrica(): string {
  const declaracoes = Object.entries(metrica).map(([nome, valor]) =>
    declaracao(`metrica-${nome}`, valor)
  );
  return `  :root {\n${declaracoes.join('\n')}\n  }`;
}

function blocoDoTema(tema: Tema): string {
  const { hsl, literais } = paleta[tema];
  const declaracoes = [
    ...Object.entries(hsl).map(([nome, valor]) => declaracao(nome, valor)),
    ...Object.entries(literais).map(([nome, valor]) => declaracao(nome, valor)),
  ];
  return `  ${SELETOR_POR_TEMA[tema]} {\n${declaracoes.join('\n')}\n  }`;
}

function declaracao(nome: string, valor: string): string {
  return `    --${paraKebab(nome)}: ${valor};`;
}

function paraKebab(nome: string): string {
  return nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);
}
