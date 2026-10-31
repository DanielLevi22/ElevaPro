import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const setup = [
  [
    /agachamento|afundo|passada|leg press|hack squat|subida no banco/i,
    "Diagonal",
    "Manter pés, joelhos e quadril visíveis durante toda a amplitude.",
  ],
  [
    /terra|stiff|bom dia|hip thrust|ponte|pélvica/i,
    "Lateral",
    "Mostrar quadril, coluna e apoio dos pés sem ocultar a posição inicial e final.",
  ],
  [
    /supino|flexão|mergulho|paralelas|tríceps/i,
    "Diagonal",
    "Mostrar mãos, cotovelos e ombros e o apoio do tronco durante o movimento.",
  ],
  [
    /remada|puxada|pull|barra fixa|face pull|retração escapular/i,
    "Diagonal",
    "Mostrar pegada, cotovelos, escápulas e estabilidade do tronco.",
  ],
  [
    /rosca/i,
    "Diagonal",
    "Mostrar punhos, cotovelos e tronco para conferir a amplitude sem balanço.",
  ],
  [
    /prancha|hollow|dead bug|bird dog|abdominal|crunch|rollout|elevação de pernas|escalador/i,
    "Lateral",
    "Enquadrar ombros, tronco e pelve, mantendo os apoios no quadro.",
  ],
  [
    /rotação|círculos|90\/90|gato|camelo/i,
    "Diagonal",
    "Mostrar a articulação em movimento e a estabilidade das regiões próximas.",
  ],
  [
    /abdução|adutora|abdutora|concha|lateral|elevação em [ytw]|anjo/i,
    "Frontal",
    "Mostrar simetria dos lados e posição dos apoios, sem ocultar as articulações.",
  ],
];

function filmingDetails(exercise) {
  const rule = setup.find(([pattern]) => pattern.test(exercise.name));
  const hold =
    exercise.category === "alongamento" ||
    /^(Prancha$|Prancha lateral$|Hollow hold$|Cadeira na parede$)/.test(exercise.name);
  return {
    angle: rule?.[1] ?? "Diagonal",
    repetitions: hold
      ? "Sustentação: registrar entrada, 6 s de posição estável e saída; cortar a parte estável."
      : "2–3 repetições completas em 4–8 s; gravar margem antes e depois.",
    focus:
      rule?.[2] ?? "Enquadrar o corpo inteiro e os apoios, com início e fim do gesto visíveis.",
    session: exercise.venue === "academia" ? "academia" : "casa",
  };
}

/** Gera a fila a partir dos nomes oficiais do seed, sem consultar dados de alunos. @example writeRecordingPlan(root) */
export async function writeRecordingPlan(root) {
  const seed = await readFile(new URL("../../supabase/seed.sql", import.meta.url), "utf8");
  const rows = [
    ...seed.matchAll(/^\('([^']+)',\s*'([^']+)',\s*'(academia|casa|ambos)',\s*'([^']+)'\)/gm),
  ];
  if (rows.length !== 181)
    throw new Error(
      `Catálogo alterado: ${rows.length}; esperado revisar roteiro dos 181 exercícios oficiais.`,
    );
  const shots = rows
    .map(([, name, muscleGroup, venue, category]) => {
      const exercise = { name, muscleGroup, venue, category };
      const slug = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-$/, "");
      return { ...exercise, slug, ...filmingDetails(exercise), technicalReviewed: false };
    })
    .sort((left, right) =>
      `${left.session}/${left.category}/${left.muscleGroup}/${left.name}`.localeCompare(
        `${right.session}/${right.category}/${right.muscleGroup}/${right.name}`,
        "pt-BR",
      ),
    );
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "recording-plan.json"),
    `${JSON.stringify({ version: 1, shots }, null, 2)}\n`,
  );
  await writeFile(join(root, "RECORDING.md"), renderPlan(shots));
  return {
    exercises: shots.length,
    sessions: {
      gym: shots.filter((shot) => shot.session === "academia").length,
      home: shots.filter((shot) => shot.session === "casa").length,
    },
  };
}

function renderPlan(shots) {
  const lines = [
    "# Roteiro de gravação dos exercícios",
    "",
    "> Rascunho para revisão técnica antes de gravar. Não é prescrição nem aprovação da execução.",
    "",
    "Gerado por `node scripts/exercise-videos.mjs plan`. Alterações manuais são substituídas; ajuste as regras no gerador.",
    "",
    "Mesmo fundo, luz e roupa. Tripé em paisagem, corpo e equipamento inteiros no quadro; sem pessoas ao fundo, espelhos identificáveis, áudio ou logotipos desnecessários. Grave com carga demonstrativa escolhida pelo profissional. Não acelere o gesto para caber no clipe.",
    "",
    "Exercícios classificados como `ambos` são gravados na sessão casa uma única vez. Alongamentos/isometrias mostram sustentação: a duração do clipe não é duração de prescrição. Rosca 21 exige revisão do recorte para não representar uma série completa em 8 s.",
    "",
    "Revise ângulo, apoio, amplitude e fechamento do loop em cada tomada com o profissional responsável. Só marque `technicalReviewed` no manifesto processado depois de assistir ao clipe.",
    "",
  ];
  let section = "";
  for (const shot of shots) {
    const next = `${shot.session} · ${shot.category} · ${shot.muscleGroup}`;
    if (section !== next) {
      lines.push(`## ${next}`, "");
      section = next;
    }
    lines.push(
      `- [ ] **${shot.name}** — ${shot.angle}. ${shot.repetitions} ${shot.focus} Arquivo: \`${shot.slug}.mp4\`.`,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}
