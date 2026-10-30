import { type LiteralTokens, palette, type ThemeName } from "@elevapro/shared";

/**
 * O material de vidro do app no web: a superfície iOS e a pilha de vidro da
 * paleta compartilhada, valendo só dentro da classe `material-glass`.
 *
 * Existe para que o trecho gerado do `globals.css` e a paleta sejam a mesma
 * coisa por construção — o teste compara o arquivo em disco com o que esta
 * função devolve. Fora do escopo, o dashboard continua zinc (ADR-0025).
 *
 * @example
 * // Falhou o teste? Cole a saída entre os marcadores do globals.css.
 * console.log(generateGlassMaterialCss());
 */
export const GENERATED_START = "/* material-glass:start";
export const GENERATED_END = "/* material-glass:end */";

const SCOPE_BY_THEME: Record<ThemeName, string> = {
  light: ".material-glass",
  dark: ".dark .material-glass",
};

/**
 * Os literais que o web lê como cor de superfície. O `@theme` do web embrulha
 * borda e muted em `hsl(var(--x))`, então eles entram como triplete com alfa,
 * e não no `rgba(...)` em que a paleta os guarda.
 */
const SURFACE_LITERALS = ["border", "muted", "mutedForeground"] as const;

const GLASS_LITERALS = [
  "glass",
  "glassStrong",
  "glassBorder",
  "glassTop",
  "glassBottom",
  "specular",
  "specularBottom",
  "sombra",
] as const satisfies readonly (keyof LiteralTokens)[];

/**
 * O que o vidro vale fora do escopo: o cartão zinc de hoje. Um gradiente de
 * três paradas iguais é a cor chapada, e o brilho some sem nada para refletir.
 */
const ZINC_GLASS: Record<(typeof GLASS_LITERALS)[number], string> = {
  glass: "hsl(var(--surface))",
  glassStrong: "rgb(var(--overlay-10))",
  glassBorder: "hsl(var(--border))",
  glassTop: "hsl(var(--surface))",
  glassBottom: "hsl(var(--surface))",
  specular: "transparent",
  specularBottom: "transparent",
  sombra: "transparent",
};

const HEADER = `${GENERATED_START} — gerado de @elevapro/shared (palette).
   Não editar à mão: glassMaterialCss.test.ts mostra o conteúdo certo. */`;

export function generateGlassMaterialCss(): string {
  const blocks = [block(":root", ZINC_GLASS), themeBlock("light"), themeBlock("dark")];
  return `${HEADER}\n${blocks.join("\n\n")}\n${GENERATED_END}`;
}

function themeBlock(theme: ThemeName): string {
  const { hsl, literais } = palette[theme];
  const surface = SURFACE_LITERALS.map((name) => [name, rgbaToHslTriplet(literais[name])]);
  const glass = GLASS_LITERALS.map((name) => [name, literais[name]]);
  // O cartão de número usa `bg-surface`; dentro do escopo ele é o grupo iOS.
  const declarations = { ...hsl, surface: hsl.card, ...Object.fromEntries([...surface, ...glass]) };
  return block(SCOPE_BY_THEME[theme], declarations);
}

function block(selector: string, declarations: Record<string, string>): string {
  const lines = Object.entries(declarations).map(
    ([name, value]) => `  --${toKebab(name)}: ${value};`,
  );
  return `${selector} {\n${lines.join("\n")}\n}`;
}

function toKebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

const RGBA = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/;

/**
 * `rgba(r, g, b, a)` → `"H S% L% / a"`, a forma que `hsl(var(--x))` aceita.
 *
 * @example rgbaToHslTriplet("rgba(60, 60, 67, 0.2)") // "240 5.5% 24.9% / 0.2"
 */
export function rgbaToHslTriplet(color: string): string {
  const match = RGBA.exec(color);
  if (!match) {
    throw new Error(`rgbaToHslTriplet: cor "${color}" não está no formato rgba(r, g, b, a)`);
  }
  const [red, green, blue] = match.slice(1, 4).map((channel) => Number(channel) / 255);
  const [hue, saturation, lightness] = hslOf(red, green, blue);
  return `${round(hue)} ${round(saturation * 100)}% ${round(lightness * 100)}% / ${match[4]}`;
}

function hslOf(red: number, green: number, blue: number): [number, number, number] {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return [hueOf(red, green, blue, max, delta), saturation, lightness];
}

function hueOf(red: number, green: number, blue: number, max: number, delta: number): number {
  if (max === red) return 60 * (((green - blue) / delta + 6) % 6);
  if (max === green) return 60 * ((blue - red) / delta + 2);
  return 60 * ((red - green) / delta + 4);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
