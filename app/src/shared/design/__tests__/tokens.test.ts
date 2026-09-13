import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { comOpacidade, coresDoTema } from '../cores';
import { fatorDaTela, REM_BASE } from '../escalaDeTexto';
import { gerarGlobalCss } from '../globalCss';
import { escala, hslParaHex, marca, metrica, paleta } from '../tokens';

/**
 * Este arquivo substitui `src/constants/__tests__/colors.test.ts`, que travava
 * a paleta oposta — o coral "Energy Gradient" — e proibia justamente as cores
 * do design. A reversão está explicada na ADR-0025; aqui fica só a guarda.
 *
 * O que importa provar:
 *  1. A conversão HSL→hex acerta, contra os hexadecimais que o design publica.
 *  2. A paleta é a do design, e o coral não volta em silêncio.
 *  3. As duas saídas — `global.css` e `useCores` — não divergem.
 */

const CAMINHO_DO_GLOBAL_CSS = join(__dirname, '..', '..', '..', 'global.css');

/** Hexadecimais da paleta anterior. Nenhum deles pode reaparecer. */
const PALETA_CORAL = ['#ff6b35', '#ff2e63', '#ff4d5a', '#00d9ff', '#9d4edd', '#0a0a0a'];

describe('hslParaHex', () => {
  /**
   * `design/tokens/colors.css` declara cada cor de marca duas vezes — o
   * triplete e um rótulo hexadecimal ao lado (`--lime` e `--lime-hex`) — e os
   * dois discordam em duas das três:
   *
   * | marca      | triplete        | renderiza | rótulo do design |
   * |------------|-----------------|-----------|------------------|
   * | lime       | 84 100% 50%     | #99ff00   | #ccff00 (72°)    |
   * | cyber blue | 184 100% 50%    | #00eeff   | #00f0ff (183,5°) |
   * | hot pink   | 324 100% 50%    | #ff0099   | #ff0099 ✔        |
   *
   * O triplete é o que vale, porque é o que renderiza: os rótulos `-hex` não
   * são referenciados em lugar nenhum do design, e o `globals.css` do web usa
   * `--primary: 84 100% 50%` — o dashboard em produção já mostra #99ff00 hoje.
   *
   * Este teste existe para que ninguém "corrija" o triplete para casar com o
   * rótulo e mude a cor de marca das duas plataformas sem perceber.
   */
  it('segue o triplete de marca, e não o rótulo hexadecimal ao lado dele', () => {
    expect(hslParaHex(marca.lime)).toBe('#99ff00');
    expect(hslParaHex(marca.cyberBlue)).toBe('#00eeff');
    expect(hslParaHex(marca.hotPink)).toBe('#ff0099');
  });

  it('reproduz as cores de métrica do kit de vidro', () => {
    // Os tripletes foram calculados à mão a partir dos hexadecimais do
    // `home-glass.html`; é este teste que verifica a conta.
    expect(hslParaHex(metrica.passos)).toBe('#34d399');
    expect(hslParaHex(metrica.calorias)).toBe('#fb923c');
    expect(hslParaHex(metrica.sono)).toBe('#818cf8');
    expect(hslParaHex(metrica.carboidrato)).toBe('#a3e635');
    expect(hslParaHex(metrica.gordura)).toBe('#fbbf24');
  });

  it('reproduz o fundo do kit de vidro, que não é preto puro', () => {
    // O fluxo chapado usa #000 e o de vidro usa #07080a; o app é vidro.
    expect(hslParaHex(paleta.escuro.hsl.background)).toBe('#07080a');
    expect(hslParaHex(paleta.claro.hsl.background)).toBe('#efeff4');
  });

  it('reproduz as superfícies iOS sem deriva de arredondamento', () => {
    expect(hslParaHex(paleta.escuro.hsl.card)).toBe('#1c1c1e');
    expect(hslParaHex(paleta.claro.hsl.card)).toBe('#ffffff');
  });

  it('recusa triplete malformado dizendo o valor e o formato esperado', () => {
    expect(() => hslParaHex('#ccff00')).toThrow('"#ccff00"');
    expect(() => hslParaHex('#ccff00')).toThrow('H S% L%');
    expect(() => hslParaHex('84 100%')).toThrow('"84 100%"');
  });
});

describe('comOpacidade', () => {
  // Existiam duas `comAlfa` com o mesmo nome e contratos diferentes: uma só
  // entendia hexadecimal, a outra só `rgb(...)`. O token chega nas duas formas,
  // e trocar um pelo outro produzia cor inválida sem erro.
  it('acrescenta o canal alfa a um hexadecimal de seis dígitos', () => {
    expect(comOpacidade('#07080a', 0.55)).toBe('#07080a8c');
  });

  it('transforma rgb em rgba com a opacidade pedida', () => {
    expect(comOpacidade('rgb(16, 18, 24)', 0.22)).toBe('rgba(16, 18, 24, 0.22)');
  });

  it('recusa a forma que não sabe compor, com o valor na mensagem', () => {
    expect(() => comOpacidade('rgba(0, 0, 0, 0.5)', 0.2)).toThrow('rgba(0, 0, 0, 0.5)');
  });
});

describe('paleta do design', () => {
  it('não usa nenhuma cor da paleta coral anterior', () => {
    // Normaliza a caixa dos dois lados: comparar `#FF6B35` contra uma saída em
    // minúscula faria este teste passar sem olhar para nada.
    const usadas = new Set(
      [...Object.values(coresDoTema('claro')), ...Object.values(coresDoTema('escuro'))].map((cor) =>
        cor.toLowerCase()
      )
    );
    expect(PALETA_CORAL.filter((hex) => usadas.has(hex))).toEqual([]);
  });

  it('mantém o lime como primária do escuro e o escurece no claro', () => {
    expect(coresDoTema('escuro').primary).toBe('#99ff00');
    expect(coresDoTema('claro').primary).not.toBe('#99ff00');
  });

  it('separa a cor de texto de marca da cor de fundo de marca', () => {
    // O lime puro não passa AA sobre fundo claro: texto e ícone usam primaryText.
    expect(coresDoTema('claro').primaryText).not.toBe(coresDoTema('claro').primary);
  });

  it('inverte fundo e texto entre os dois temas', () => {
    expect(coresDoTema('escuro').background).toBe('#07080a');
    expect(coresDoTema('escuro').foreground).toBe('#ffffff');
    expect(coresDoTema('claro').foreground).toBe('#000000');
  });

  it('define os mesmos nomes de token nos dois temas', () => {
    expect(Object.keys(coresDoTema('claro')).sort()).toEqual(
      Object.keys(coresDoTema('escuro')).sort()
    );
  });
});

describe('global.css', () => {
  const css = gerarGlobalCss();

  it('está em dia com os tokens', () => {
    // Falhou? O diff abaixo é o conteúdo correto — cole em src/global.css.
    expect(readFileSync(CAMINHO_DO_GLOBAL_CSS, 'utf8')).toBe(css);
  });

  it('usa os dois únicos seletores que o NativeWind lê como variável', () => {
    // `.light` é ignorado em silêncio pelo react-native-css-interop; foi por
    // isso que o tema claro nunca valeu no app apesar de estar declarado.
    expect(css).toContain(':root {');
    expect(css).toContain('.dark:root {');
    expect(css).not.toContain('.light');
  });

  it('serve ao NativeWind exatamente os tokens que useCores resolve', () => {
    const nomesNoCss = [...css.matchAll(/--([a-z-]+):/g)].map(([, nome]) => nome);
    const nomesEmKebab = Object.keys(coresDoTema('escuro')).map((nome) =>
      nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)
    );
    expect(new Set(nomesNoCss)).toEqual(new Set(nomesEmKebab));
  });

  it('entrega o triplete cru na marca, para o Tailwind aceitar /50', () => {
    expect(css).toContain('--primary: 84 100% 50%;');
    expect(css).toContain('--border: rgba(84, 84, 88, 0.65);');
  });
});

describe('escala de texto', () => {
  /**
   * `escala.texto` e o `fontSize` do Tailwind são duas declarações da mesma
   * escala: uma para quem lê número em TypeScript, outra para quem escreve
   * `text-corpo`. Duas declarações da mesma coisa divergem — é literalmente o
   * defeito que este módulo existe para matar, e não teria graça repeti-lo uma
   * camada acima.
   */
  it('é a mesma no TypeScript e no Tailwind', () => {
    // O Tailwind declara em `rem` para a escala poder acompanhar o aparelho;
    // o caminho de volta tem de dar exatamente os pixels do desenho.
    const { theme } = require('../../../../tailwind.config.js');
    const doTailwind = Object.fromEntries(
      Object.entries(theme.extend.fontSize).map(([nome, valor]) => [
        nome,
        Number.parseFloat(valor as string) * REM_BASE,
      ])
    );

    expect(doTailwind).toEqual(escala.texto);
  });

  it('usa os tamanhos iOS das telas do mobile, e não os 14 de corpo do dashboard', () => {
    expect(escala.texto.corpo).toBe(17);
    expect(escala.texto.rotulo).toBe(16);
    expect(escala.texto.legenda).toBe(13);
  });
});

describe('fator de escala da tela', () => {
  /**
   * O kit foi desenhado num telefone de 390pt. Sem ajuste, num aparelho de
   * 448dp tudo aparece cerca de 15% menor em relação à tela.
   */
  it('cresce na proporção da largura, contra os 390 do desenho', () => {
    expect(fatorDaTela(390)).toBeCloseTo(1);
    expect(fatorDaTela(448)).toBeCloseTo(1.149, 3);
  });

  it('não encolhe em telefone menor que o desenho', () => {
    // Encolher poria a legibilidade em jogo, que é pior que perder proporção.
    expect(fatorDaTela(320)).toBe(1);
  });

  it('para de crescer antes de virar cartaz no tablet', () => {
    // Aplicativo nativo em tela grande mostra mais conteúdo, não conteúdo
    // maior: sem teto, 1024dp daria fator 2,6 e um título de 83 de altura.
    expect(fatorDaTela(1024)).toBe(1.2);
    expect(fatorDaTela(768)).toBe(1.2);
  });
});
