#!/usr/bin/env node
/**
 * Reagrupa o écorché em malhas nomeadas por grupo muscular.
 *
 * O modelo de origem tem 87 malhas chamadas `Object_0..Object_86`, partidas por
 * ilha de textura na exportação: 48 delas ocupam mais de 50% do corpo, e a
 * menor ocupa 21%. Pintar uma dessas malhas tinge quase o boneco inteiro, e foi
 * por isso que o mapa muscular nunca acertou o lugar da cor.
 *
 * A geometria, porém, está separada — ela só está agrupada errado. Soldando os
 * vértices e caminhando pelos triângulos aparecem 283 peças conectadas, e 218
 * delas têm tamanho de músculo. Este script reagrupa essas peças por posição
 * anatômica e emite um GLB onde cada malha se chama pelo que ela é.
 *
 * Roda uma vez, em tempo de build. O resultado entra no repositório.
 *
 * Origem: "Ecorché practice" de martinjario, CC BY 4.0 — obra derivada é
 * permitida e a atribuição é obrigatória. Ver NOTICE.md.
 *
 * Uso: node scripts/modelo/reagrupar.js
 */

const fs = require("node:fs");
const path = require("node:path");
const { carregar, lerAcessor } = require("./glb.js");

// A origem mora fora de `web/public/` de propósito: ela é insumo de build, e
// dentro de `public/` seria baixável por qualquer cliente sem servir para nada.
const ENTRADA = "scripts/modelo/fonte/ecorche-original.glb";
const SAIDA = "web/public/models/corpo-por-musculo.glb";

// Faixas anatômicas medidas no próprio modelo, não tiradas de tabela: os pares
// simétricos maiores foram identificados a olho e as fronteiras saíram do meio
// entre eles.  X = lateral · Y = profundidade, maior é atrás · Z = altura
// Acima disto o modelo é pescoço, crânio e vértebras cervicais. Estava em 16 e
// deixava uma dúzia de ilhas pequenas e centrais (|x|≈0.1, 27 a 336 vértices)
// caírem em Costas — são ossos, não músculo, e eram elas que faziam a seleção
// de Costas subir até o pescoço. O trapézio sobrevive porque o centroide dele
// fica em z≈12.7, mesmo com as fibras chegando a 20.
const TOPO_DO_TRONCO = 13.5;
const LARGURA_DO_TRONCO = 6.5;
const ATRAS = 1.5;

// O braço está em A-pose, atrás do plano do tronco: a profundidade das ilhas de
// braço se agrupa entre 2.9 e 4.6, não em torno de zero. Com a fronteira do
// tronco, o Bíceps ficava zerado. Em 3.75 os oito músculos do braço se dividem
// 4 e 4, e cada metade sai em pares simétricos — que é o sinal de que a
// fronteira caiu no vão certo e não no meio de um músculo.
const ATRAS_NO_BRACO = 3.75;

/** O que não é grupo treinável: cabeça, pescoço, mãos, pés, esqueleto. */
const NEUTRO = "Corpo";

/**
 * As faixas do braço, medidas ilha a ilha.
 *
 * O braço em A-pose é **muito mais curto em altura** do que a intuição diz: do
 * deltoide (z≈10.5) à ponta do dedo (z≈−13.8) são 24 unidades, contra 68 de
 * corpo inteiro. A primeira versão usou faixas de perna e errou nas duas: o
 * Bíceps ia até z>−6 e engolia o antebraço junto, e o Antebraço, de −18 a −6,
 * caía inteiro na mão.
 *
 * Onde as juntas realmente estão, pelos centroides das 40 ilhas:
 *   ombro      z ≈ 10.5
 *   braço      z ≈ 5.7 a 4.3
 *   cotovelo   z ≈ 2
 *   antebraço  z ≈ 0 a −5
 *   punho      z ≈ −6
 *   mão        z ≈ −8 a −14
 */
function noBraco(y, z) {
  if (z > 8) return "Ombros";
  if (z > 2) return y > ATRAS_NO_BRACO ? "Tríceps" : "Bíceps";
  if (z > -6) return "Antebraço";
  return NEUTRO;
}

function noTronco(y, z) {
  if (z > 4) return y > ATRAS ? "Costas" : "Peitoral";
  // Os eretores descem mais que o dorsal, então a fronteira sobe aqui.
  if (z > -5) return y > 2.5 ? "Costas" : "Abdômen";
  if (z > -12) return y > ATRAS ? "Glúteos" : "Quadríceps";
  if (z > -26) return y > 1 ? "Isquiotibiais" : "Quadríceps";
  if (z > -38) return "Panturrilha";
  return NEUTRO;
}

/**
 * Divide um grupo em sub-músculos, onde a geometria permite.
 *
 * Nem todo grupo divide, e a diferença não é de esforço: é de material. O
 * deltoide é **uma malha só por lado** no écorché, então anterior, lateral e
 * posterior não existem como peças — separá-los exigiria cortar a geometria por
 * ângulo, que é outra técnica. Quadríceps chega com 16 ilhas e isquiotibiais
 * com 14, então nesses a divisão é só ler a posição.
 *
 * Grupo que não divide devolve o próprio nome, e vira um sub-músculo de um.
 */
function subMusculo(grupo, centro) {
  const lateral = Math.abs(centro[0]);
  const y = centro[1];
  const z = centro[2];

  if (grupo === "Quadríceps") {
    // As três cabeças se distinguem pela distância da linha média: o vasto
    // lateral corre por fora, o medial por dentro, o reto femoral no meio.
    if (lateral > 5) return "Vasto lateral";
    if (lateral > 3.6) return "Reto femoral";
    return "Vasto medial";
  }

  if (grupo === "Isquiotibiais") {
    if (lateral > 4.5) return "Bíceps femoral";
    return y > 2 ? "Semitendinoso" : "Semimembranoso";
  }

  if (grupo === "Costas") {
    if (z > 8) return "Trapézio";
    // Largura, não altura: os eretores da espinha são a coluna central
    // (|x|≈0.1) e o dorsal se abre para os lados (|x| de 3.8 a 6.2). Dividir
    // por altura deu Lombar com 6 vértices, porque o eretor é um músculo longo
    // cujo centroide fica no meio das costas, não embaixo.
    return lateral < 2 ? "Lombar" : "Dorsal";
  }

  if (grupo === "Peitoral") {
    // O peitoral maior é o par grande e frontal; o que sobra atrás dele, na
    // lateral da caixa torácica, é serrátil.
    return y > 0.5 ? "Serrátil" : "Peitoral maior";
  }

  if (grupo === "Glúteos") {
    // O médio corre por fora e mais alto; o máximo é o volume posterior.
    return lateral > 4 ? "Glúteo médio" : "Glúteo máximo";
  }

  if (grupo === "Panturrilha") {
    // O gastrocnêmio é superficial (y≈4.0); o sóleo fica embaixo dele (y≈2.2).
    return y > 3.5 ? "Gastrocnêmio" : "Sóleo";
  }

  if (grupo === "Abdômen") {
    // O reto abdominal é a faixa central; os oblíquos abrem para os lados.
    return lateral > 3 ? "Oblíquos" : "Reto abdominal";
  }

  if (grupo === "Antebraço") {
    // Flexores na face anterior, extensores na posterior. O braço está em
    // A-pose, então a fronteira é a mesma deslocada do resto do membro.
    return y > 3.5 ? "Extensores do antebraço" : "Flexores do antebraço";
  }

  if (grupo === "Bíceps") {
    // Duas ilhas por lado: a curta corre por dentro e à frente, a longa por
    // fora e um pouco atrás.
    return y > 3.2 ? "Cabeça longa do bíceps" : "Cabeça curta do bíceps";
  }

  if (grupo === "Tríceps") {
    // **Duas cabeças, não três.** O écorché traz duas ilhas por lado, então a
    // cabeça medial — que fica embaixo das outras duas — não existe como peça
    // separada aqui. Prometer três na tela seria oferecer uma seleção que o
    // modelo não sabe acender.
    return lateral > 9.15 ? "Cabeça lateral do tríceps" : "Cabeça longa do tríceps";
  }

  return grupo;
}

function grupoDoCentro(centro) {
  const x = centro[0];
  const y = centro[1];
  const z = centro[2];
  if (z > TOPO_DO_TRONCO) return NEUTRO;
  return Math.abs(x) > LARGURA_DO_TRONCO ? noBraco(y, z) : noTronco(y, z);
}

/** Solda os vértices, caminha pelos triângulos e devolve as peças conectadas. */
function ilhasComTriangulos(caminho) {
  const { gltf, bin } = carregar(caminho);

  const chaves = new Map();
  const pos = [];
  const nor = [];
  const pai = [];
  const acha = (a) => {
    while (pai[a] !== a) {
      pai[a] = pai[pai[a]];
      a = pai[a];
    }
    return a;
  };
  const une = (a, b) => {
    a = acha(a);
    b = acha(b);
    if (a !== b) pai[a] = b;
  };

  function no(p, n) {
    const k = `${p[0].toFixed(3)},${p[1].toFixed(3)},${p[2].toFixed(3)}`;
    let i = chaves.get(k);
    if (i === undefined) {
      i = pos.length / 3;
      chaves.set(k, i);
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      pai.push(i);
    }
    return i;
  }

  const triangulos = [];
  for (const m of gltf.meshes) {
    for (const p of m.primitives) {
      const P = lerAcessor(gltf, bin, p.attributes.POSITION);
      const N = lerAcessor(gltf, bin, p.attributes.NORMAL);
      const I = lerAcessor(gltf, bin, p.indices);
      const local = [];
      for (let i = 0; i < P.length / 3; i++) {
        local.push(
          no([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]]),
        );
      }
      for (let t = 0; t < I.length; t += 3) {
        const a = local[I[t]];
        const b = local[I[t + 1]];
        const c = local[I[t + 2]];
        une(a, b);
        une(b, c);
        triangulos.push([a, b, c]);
      }
    }
  }

  const ilhas = new Map();
  for (const tri of triangulos) {
    const r = acha(tri[0]);
    let e = ilhas.get(r);
    if (!e) {
      e = { tris: [], vertices: new Set() };
      ilhas.set(r, e);
    }
    e.tris.push(tri);
    for (const v of tri) e.vertices.add(v);
  }

  for (const e of ilhas.values()) {
    const soma = [0, 0, 0];
    for (const v of e.vertices) {
      for (let k = 0; k < 3; k++) soma[k] += pos[v * 3 + k];
    }
    e.centro = soma.map((s) => s / e.vertices.size);
  }

  return { ilhas: [...ilhas.values()], pos, nor };
}

const alinhar = (n) => (4 - (n % 4)) % 4;

/** Escreve o GLB: uma malha e um material por grupo. */
function emitir(grupos, saida) {
  const bufs = [];
  let offset = 0;
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];
  const materials = [];

  function view(buf, alvo) {
    const pad = alinhar(buf.length);
    bufs.push(buf, Buffer.alloc(pad));
    const i = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: buf.length,
      target: alvo,
    });
    offset += buf.length + pad;
    return i;
  }

  for (const [nome, dados] of grupos) {
    const { posicoes, normais, indices } = dados;

    const bp = Buffer.alloc(posicoes.length * 4);
    const bn = Buffer.alloc(normais.length * 4);
    const bi = Buffer.alloc(indices.length * 4);
    for (let i = 0; i < posicoes.length; i++) bp.writeFloatLE(posicoes[i], i * 4);
    for (let i = 0; i < normais.length; i++) bn.writeFloatLE(normais[i], i * 4);
    for (let i = 0; i < indices.length; i++) bi.writeUInt32LE(indices[i], i * 4);

    const lo = [1e9, 1e9, 1e9];
    const hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < posicoes.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], posicoes[i + k]);
        hi[k] = Math.max(hi[k], posicoes[i + k]);
      }
    }

    const vp = view(bp, 34962);
    const vn = view(bn, 34962);
    const vi = view(bi, 34963);
    const ap = accessors.length;
    accessors.push({
      bufferView: vp,
      componentType: 5126,
      count: posicoes.length / 3,
      type: "VEC3",
      min: lo,
      max: hi,
    });
    accessors.push({
      bufferView: vn,
      componentType: 5126,
      count: normais.length / 3,
      type: "VEC3",
    });
    accessors.push({
      bufferView: vi,
      componentType: 5125,
      count: indices.length,
      type: "SCALAR",
    });

    // Um material por grupo: compartilhado, mudar a cor de um mexeria em todos.
    const mat = materials.length;
    materials.push({
      name: nome,
      pbrMetallicRoughness: {
        baseColorFactor: [0.55, 0.55, 0.58, 1],
        metallicFactor: 0,
        roughnessFactor: 0.85,
      },
    });

    meshes.push({
      name: nome,
      primitives: [
        {
          attributes: { POSITION: ap, NORMAL: ap + 1 },
          indices: ap + 2,
          material: mat,
        },
      ],
    });
    nodes.push({ name: nome, mesh: meshes.length - 1 });
  }

  const bin = Buffer.concat(bufs);
  const gltf = {
    asset: {
      version: "2.0",
      generator: "ElevaPro scripts/modelo/reagrupar.js",
      copyright: "Derivado de Ecorche practice por martinjario (CC BY 4.0)",
    },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  const json = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonChunk = Buffer.concat([json, Buffer.alloc(alinhar(json.length), 0x20)]);

  const cabecalho = Buffer.alloc(12);
  cabecalho.write("glTF", 0);
  cabecalho.writeUInt32LE(2, 4);
  cabecalho.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);

  const cj = Buffer.alloc(8);
  cj.writeUInt32LE(jsonChunk.length, 0);
  cj.write("JSON", 4);
  const cb = Buffer.alloc(8);
  cb.writeUInt32LE(bin.length, 0);
  cb.write("BIN", 4);

  fs.writeFileSync(saida, Buffer.concat([cabecalho, cj, jsonChunk, cb, bin]));
}

const dados = ilhasComTriangulos(ENTRADA);
const porGrupo = new Map();

for (const ilha of dados.ilhas) {
  const grupo = grupoDoCentro(ilha.centro);
  const nome = grupo === NEUTRO ? NEUTRO : subMusculo(grupo, ilha.centro);
  let g = porGrupo.get(nome);
  if (!g) {
    g = { posicoes: [], normais: [], indices: [], remap: new Map(), ilhas: 0 };
    porGrupo.set(nome, g);
  }
  g.ilhas++;
  for (const tri of ilha.tris) {
    for (const v of tri) {
      let novo = g.remap.get(v);
      if (novo === undefined) {
        novo = g.posicoes.length / 3;
        g.remap.set(v, novo);
        g.posicoes.push(dados.pos[v * 3], dados.pos[v * 3 + 1], dados.pos[v * 3 + 2]);
        g.normais.push(dados.nor[v * 3], dados.nor[v * 3 + 1], dados.nor[v * 3 + 2]);
      }
      g.indices.push(novo);
    }
  }
}

// `Corpo` primeiro: é o fundo neutro sobre o qual os músculos são pintados.
const ordem = [...porGrupo.entries()].sort((a, b) =>
  a[0] === NEUTRO ? -1 : b[0] === NEUTRO ? 1 : 0,
);
emitir(ordem, SAIDA);

const bytes = fs.statSync(SAIDA).size;
const antes = fs.statSync(ENTRADA).size;
console.log(
  `${path.basename(SAIDA)} — ${(bytes / 1e6).toFixed(1)} MB (origem: ${(antes / 1e6).toFixed(1)} MB)`,
);
console.log("");
console.log(
  "malha".padEnd(16) + "ilhas".padStart(6) + "vertices".padStart(10) + "triangulos".padStart(12),
);
for (const [nome, g] of ordem) {
  console.log(
    nome.padEnd(16) +
      String(g.ilhas).padStart(6) +
      String(g.posicoes.length / 3).padStart(10) +
      String(g.indices.length / 3).padStart(12),
  );
}

// O corpo é simétrico, então quase todo músculo vem em par. Contagem ímpar não
// é prova de erro — peça de linha média (esterno, sacro) é legitimamente única
// —, mas é onde vale olhar primeiro quando a cor cai no lugar errado.
const impares = ordem.filter(([nome, g]) => nome !== NEUTRO && g.ilhas % 2 === 1);
if (impares.length > 0) {
  console.log("");
  console.log(`nº ímpar de ilhas (conferir): ${impares.map(([n]) => n).join(", ")}`);
}
