import { readFileSync } from "node:fs";
import { join } from "node:path";
import { palette } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import {
  GENERATED_END,
  GENERATED_START,
  generateGlassMaterialCss,
  rgbaToHslTriplet,
} from "../glassMaterialCss";

const GLOBALS_CSS = join(__dirname, "..", "..", "..", "app", "globals.css");

/** As declarações de um bloco do CSS gerado, como mapa nome → valor. */
function declarationsOf(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloco "${selector}" não está no CSS gerado`);
  const body = css.slice(start, css.indexOf("}", start));
  return new Map(
    [...body.matchAll(/--([a-z-]+): ([^;]+);/g)].map(([, name, value]) => [name, value]),
  );
}

describe("globals.css", () => {
  it("está em dia com a paleta compartilhada", () => {
    // Falhou? O esperado abaixo é o conteúdo certo do trecho entre os marcadores.
    const css = readFileSync(GLOBALS_CSS, "utf8");
    const start = css.indexOf(GENERATED_START);
    const end = css.indexOf(GENERATED_END);
    expect(start, "marcador de início do material de vidro").toBeGreaterThanOrEqual(0);
    expect(css.slice(start, end + GENERATED_END.length)).toBe(generateGlassMaterialCss());
  });
});

describe("material de vidro", () => {
  const css = generateGlassMaterialCss();

  it("traz a superfície e o vidro do app para dentro do escopo, nos dois temas", () => {
    const light = declarationsOf(css, ".material-glass");
    const dark = declarationsOf(css, ".dark .material-glass");

    expect(light.get("background")).toBe(palette.light.hsl.background);
    expect(dark.get("background")).toBe(palette.dark.hsl.background);
    expect(dark.get("card")).toBe(palette.dark.hsl.card);
    expect(light.get("glass")).toBe(palette.light.literais.glass);
    expect(dark.get("glass")).toBe(palette.dark.literais.glass);
    expect(dark.get("specular-bottom")).toBe(palette.dark.literais.specularBottom);
  });

  it("veste a sidebar com o vidro da barra de abas do app", () => {
    const light = declarationsOf(css, ".material-glass");
    const dark = declarationsOf(css, ".dark .material-glass");

    expect(dark.get("panel-glass")).toBe(palette.dark.literais.barraDeAbas);
    expect(light.get("panel-glass")).toBe(palette.light.literais.barraDeAbas);
    expect(dark.get("panel-glass-border")).toBe(palette.dark.literais.glassBorder);
    expect(dark.get("panel-bg")).toBe(palette.dark.literais.glassStrong);
  });

  it("entrega borda e muted como triplete, porque o Tailwind do web os embrulha em hsl()", () => {
    const dark = declarationsOf(css, ".dark .material-glass");
    expect(dark.get("border")).toBe("240 2.3% 33.7% / 0.65");
  });

  it("deixa o vidro valer o cartão zinc fora do escopo", () => {
    // Componente que adota o vidro aparece em outras telas (o cartão de número
    // está também nas métricas do aluno), e lá nada pode mudar.
    const outside = declarationsOf(css, ":root");
    const inside = declarationsOf(css, ".material-glass");
    const glassNames = [...inside.keys()].filter((name) => /^(glass|specular|sombra)/.test(name));

    expect(glassNames.filter((name) => !outside.has(name))).toEqual([]);
    expect(outside.get("glass")).toBe("hsl(var(--surface))");
    expect(outside.get("glass-border")).toBe("hsl(var(--border))");
  });
});

describe("rgbaToHslTriplet", () => {
  it("converte rgba em triplete com alfa", () => {
    expect(rgbaToHslTriplet("rgba(60, 60, 67, 0.2)")).toBe("240 5.5% 24.9% / 0.2");
  });

  it("recusa o que não é rgba, com o valor e o formato na mensagem", () => {
    expect(() => rgbaToHslTriplet("#ffffff")).toThrow('"#ffffff"');
    expect(() => rgbaToHslTriplet("#ffffff")).toThrow("rgba(r, g, b, a)");
  });
});
