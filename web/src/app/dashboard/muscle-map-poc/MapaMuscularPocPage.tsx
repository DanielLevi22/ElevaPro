"use client";

import { useMemo, useState } from "react";
import { CorpoGlb } from "@/modules/students/components/muscle-map/poc/CorpoGlb";
import {
  CorpoSvg,
  GRUPOS,
  type Grupo,
} from "@/modules/students/components/muscle-map/poc/CorpoSvg";
import { escalaDeCor, SEM_DADO } from "@/modules/students/components/muscle-map/poc/escalaDeCor";

/**
 * POC do mapa muscular em SVG. **Spike descartável — não é a tela.**
 *
 * Responde a uma pergunta só: pintar músculo por nome, num SVG desenhado como
 * músculo, resolve o que o modelo 3D nunca resolveu? Lá as malhas são
 * `object_0..object_86`, partidas por material na exportação do écorché, e o
 * de-para saía de centroide de bounding box — por isso nunca acertava o lugar.
 *
 * Aqui não existe de-para: o grupo carrega o nome do músculo porque quem
 * desenhou sabia o que estava desenhando.
 *
 * Os volumes abaixo são sintéticos de propósito. O que se está testando é a
 * pintura e a legibilidade, não a consulta — o `useWorkoutMetrics` já entrega
 * `volumeByMuscle` no formato que a escala consome.
 *
 * Apagar a pasta `poc/` junto com esta rota depois de decidir.
 */

/** Um perfil de treino plausível, para o degradê ter o que mostrar. */
const CENARIOS: Record<string, Record<string, number>> = {
  "Fase de força — inferiores": {
    Quadríceps: 24000,
    Glúteos: 18000,
    Isquiotibiais: 15000,
    Panturrilha: 6000,
    Abdômen: 2200,
    Costas: 4000,
  },
  "Fase de hipertrofia — superiores": {
    Peitoral: 14000,
    Costas: 16000,
    Ombros: 9000,
    Bíceps: 5200,
    Tríceps: 5800,
    Antebraço: 1800,
    Abdômen: 2400,
  },
  "Semana leve": {
    Peitoral: 2000,
    Costas: 2400,
    Quadríceps: 3000,
    Abdômen: 1500,
  },
  "Sem treino no período": {},
};

export function MapaMuscularPocPage() {
  const [cenario, setCenario] = useState<string>(Object.keys(CENARIOS)[0]);
  const [selecionado, setSelecionado] = useState<Grupo | null>(null);
  const [forma, setForma] = useState<"3d" | "svg">("3d");

  const volumes = useMemo(
    () => GRUPOS.map((muscle) => ({ muscle, volume: CENARIOS[cenario]?.[muscle] ?? 0 })),
    [cenario],
  );

  const cores = useMemo(() => escalaDeCor(volumes), [volumes]);

  const ordenados = useMemo(
    () => [...volumes].filter((v) => v.volume > 0).sort((a, b) => b.volume - a.volume),
    [volumes],
  );

  return (
    <div className="flex max-w-5xl flex-col gap-8 p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
          Spike descartável
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Mapa muscular em SVG
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          O corpo aqui é provisório — formas simples, anatomia aproximada. O que está sendo testado
          é se pintar músculo por nome resolve o problema do mapa 3D, onde as malhas do modelo não
          seguem a anatomia e a cor nunca caía no lugar certo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(CENARIOS).map((nome) => (
          <button
            className={
              cenario === nome
                ? "rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
                : "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            }
            key={nome}
            onClick={() => setCenario(nome)}
            type="button"
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["3d", "svg"] as const).map((f) => (
              <button
                className={
                  forma === f
                    ? "rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white dark:bg-white dark:text-neutral-900"
                    : "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                }
                key={f}
                onClick={() => setForma(f)}
                type="button"
              >
                {f === "3d" ? "Modelo reagrupado" : "SVG provisório"}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-950 p-4 dark:border-neutral-800">
            {forma === "3d" ? (
              <CorpoGlb corPorGrupo={cores} corSemDado={SEM_DADO} />
            ) : (
              <CorpoSvg
                corPorGrupo={cores}
                corSemDado={SEM_DADO}
                onSelecionar={(g) => setSelecionado(g === selecionado ? null : g)}
                selecionado={selecionado}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Volume no período
          </p>

          {ordenados.length === 0 && (
            <p className="text-sm text-neutral-500">
              Nenhuma série registrada. Todos os músculos ficam no tom de ausência — que é diferente
              do tom de "treinou pouco".
            </p>
          )}

          {ordenados.map(({ muscle, volume }) => (
            <button
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900"
              key={muscle}
              onClick={() => setSelecionado(muscle === selecionado ? null : (muscle as Grupo))}
              type="button"
            >
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: cores.get(muscle) ?? SEM_DADO }}
              />
              <span className="flex-1 text-sm text-neutral-800 dark:text-neutral-200">
                {muscle}
              </span>
              <span className="font-mono text-xs text-neutral-500">
                {volume.toLocaleString("pt-BR")} kg
              </span>
            </button>
          ))}

          {selecionado && (
            <p className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <strong>{selecionado}</strong> destacado nas duas vistas. Ombros e Antebraço aparecem
              de frente e de costas — foi isso que decidiu usar <code>data-musculo</code> em vez de{" "}
              <code>id</code>, que precisa ser único.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 text-sm leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <p className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">
          O que este POC já responde
        </p>
        <p>
          A cor cai no músculo certo porque não há tradução no meio: o grupo do SVG carrega o nome.
          Trocar o desenho provisório pelo ilustrado é trocar <code>CorpoSvg.tsx</code> — a escala,
          a seleção e a lista continuam iguais, e os testes da escala não encostam no desenho.
        </p>
        <p className="mt-2">
          O que ele <strong>não</strong> responde: se a métrica deve ser tonelagem ou intensidade, e
          se o recorte deve ser por fase de periodização. Nenhuma das duas depende do desenho.
        </p>
      </div>
    </div>
  );
}
