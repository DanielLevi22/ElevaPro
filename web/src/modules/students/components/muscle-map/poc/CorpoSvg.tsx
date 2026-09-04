/**
 * Corpo provisório do POC. **Não é o desenho final.**
 *
 * Feito de primitivas simples — elipses e retângulos arredondados — só para
 * responder à pergunta do POC: pintar músculo por nome funciona, e o resultado
 * é legível? A anatomia aqui é aproximada de propósito; o desenho bom vem de
 * um SVG ilustrado, e trocá-lo é trocar este arquivo.
 *
 * **A decisão que este arquivo registra:** cada músculo é um `<g>` com
 * `data-musculo`, e não um `<path>` com `id`. Dois motivos, e o segundo só
 * apareceu ao desenhar:
 *
 * 1. `id` precisa ser único no documento, e Ombros e Antebraço aparecem **nas
 *    duas vistas**. Com `id` seria preciso `ombros-frente` e `ombros-costas`, e
 *    aí o de-para volta a existir — que é a coisa que o modelo 3D nos ensinou
 *    a não querer.
 * 2. `fill` é herdado em SVG, então pintar o grupo pinta todas as partes dele
 *    de uma vez. Um músculo pode ser feito de várias formas sem que quem pinta
 *    precise saber disso.
 */

/** Os 11 grupos que o app conhece, na grafia que `MUSCLE_MESH_MAP` já usa. */
export const GRUPOS = [
  "Peitoral",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Abdômen",
  "Glúteos",
  "Quadríceps",
  "Isquiotibiais",
  "Panturrilha",
] as const;

export type Grupo = (typeof GRUPOS)[number];

/** Cinza do corpo onde não há músculo mapeado: cabeça, pescoço, mãos, pés. */
const NEUTRO = "#3f3f46";

interface CorpoSvgProps {
  /** Cor de preenchimento por grupo. Grupo ausente cai no tom de "sem dado". */
  corPorGrupo: Map<string, string>;
  corSemDado: string;
  onSelecionar?: (grupo: Grupo) => void;
  selecionado?: Grupo | null;
}

export function CorpoSvg({ corPorGrupo, corSemDado, onSelecionar, selecionado }: CorpoSvgProps) {
  const cor = (grupo: Grupo) => corPorGrupo.get(grupo) ?? corSemDado;

  /** Props comuns de um grupo muscular clicável. */
  const musculo = (grupo: Grupo) => ({
    "data-musculo": grupo,
    fill: cor(grupo),
    stroke: selecionado === grupo ? "#ffffff" : "transparent",
    strokeWidth: 1.5,
    style: { cursor: onSelecionar ? "pointer" : "default", transition: "fill 200ms" },
    onClick: () => onSelecionar?.(grupo),
  });

  return (
    <svg
      aria-label="Mapa muscular"
      role="img"
      viewBox="0 0 440 620"
      style={{ width: "100%", height: "auto" }}
    >
      <title>Mapa muscular — frente e costas</title>

      {/* ── FRENTE ─────────────────────────────────────────────────────── */}
      <g transform="translate(0,0)">
        <text x="110" y="18" fill="#71717a" fontSize="11" textAnchor="middle">
          FRENTE
        </text>

        {/* Cabeça, pescoço, mãos e pés não são grupos treináveis. */}
        <circle cx="110" cy="62" r="26" fill={NEUTRO} />
        <rect x="100" y="86" width="20" height="14" fill={NEUTRO} />

        <g {...musculo("Ombros")}>
          <ellipse cx="66" cy="116" rx="18" ry="16" />
          <ellipse cx="154" cy="116" rx="18" ry="16" />
        </g>

        <g {...musculo("Peitoral")}>
          <rect x="80" y="102" width="26" height="34" rx="10" />
          <rect x="114" y="102" width="26" height="34" rx="10" />
        </g>

        <g {...musculo("Bíceps")}>
          <rect x="50" y="134" width="20" height="46" rx="10" />
          <rect x="150" y="134" width="20" height="46" rx="10" />
        </g>

        <g {...musculo("Antebraço")}>
          <rect x="44" y="182" width="18" height="48" rx="9" />
          <rect x="158" y="182" width="18" height="48" rx="9" />
        </g>
        <circle cx="53" cy="238" r="9" fill={NEUTRO} />
        <circle cx="167" cy="238" r="9" fill={NEUTRO} />

        <g {...musculo("Abdômen")}>
          <rect x="86" y="142" width="48" height="72" rx="12" />
        </g>

        {/* Quadril neutro: a cintura pélvica não é grupo treinável. */}
        <rect x="82" y="218" width="56" height="26" rx="10" fill={NEUTRO} />

        <g {...musculo("Quadríceps")}>
          <rect x="80" y="248" width="26" height="96" rx="13" />
          <rect x="114" y="248" width="26" height="96" rx="13" />
        </g>

        <g {...musculo("Panturrilha")}>
          <rect x="83" y="352" width="21" height="72" rx="10" />
          <rect x="116" y="352" width="21" height="72" rx="10" />
        </g>
        <ellipse cx="93" cy="434" rx="12" ry="8" fill={NEUTRO} />
        <ellipse cx="127" cy="434" rx="12" ry="8" fill={NEUTRO} />
      </g>

      {/* ── COSTAS ─────────────────────────────────────────────────────── */}
      <g transform="translate(220,0)">
        <text x="110" y="18" fill="#71717a" fontSize="11" textAnchor="middle">
          COSTAS
        </text>

        <circle cx="110" cy="62" r="26" fill={NEUTRO} />
        <rect x="100" y="86" width="20" height="14" fill={NEUTRO} />

        <g {...musculo("Ombros")}>
          <ellipse cx="66" cy="116" rx="18" ry="16" />
          <ellipse cx="154" cy="116" rx="18" ry="16" />
        </g>

        <g {...musculo("Costas")}>
          <path d="M82,100 L138,100 L146,168 L110,186 L74,168 Z" />
        </g>

        <g {...musculo("Tríceps")}>
          <rect x="50" y="134" width="20" height="46" rx="10" />
          <rect x="150" y="134" width="20" height="46" rx="10" />
        </g>

        <g {...musculo("Antebraço")}>
          <rect x="44" y="182" width="18" height="48" rx="9" />
          <rect x="158" y="182" width="18" height="48" rx="9" />
        </g>
        <circle cx="53" cy="238" r="9" fill={NEUTRO} />
        <circle cx="167" cy="238" r="9" fill={NEUTRO} />

        <g {...musculo("Glúteos")}>
          <ellipse cx="96" cy="212" rx="20" ry="22" />
          <ellipse cx="124" cy="212" rx="20" ry="22" />
        </g>

        <g {...musculo("Isquiotibiais")}>
          <rect x="80" y="240" width="26" height="100" rx="13" />
          <rect x="114" y="240" width="26" height="100" rx="13" />
        </g>

        <g {...musculo("Panturrilha")}>
          <rect x="83" y="348" width="21" height="76" rx="10" />
          <rect x="116" y="348" width="21" height="76" rx="10" />
        </g>
        <ellipse cx="93" cy="434" rx="12" ry="8" fill={NEUTRO} />
        <ellipse cx="127" cy="434" rx="12" ry="8" fill={NEUTRO} />
      </g>
    </svg>
  );
}
