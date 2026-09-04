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
 * **Os nomes usam underscore no lugar de espaço, e isso não é estilo.** O
 * GLTFLoader do three.js passa todo nome por `sanitizeNodeName`, que troca
 * espaço por underscore. Um nome com espaço no arquivo chega à tela com
 * underscore, a busca por nome falha e o músculo não acende — foi o que
 * aconteceu com "Vasto_lateral" enquanto "Trapézio", de uma palavra só,
 * funcionava. Gravar já sanitizado faz o nome ser o mesmo nos três lugares:
 * arquivo, three.js e taxonomia. A tela formata para exibir.
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
    if (lateral > 5) return "Vasto_lateral";
    if (lateral > 3.6) return "Reto_femoral";
    return "Vasto_medial";
  }

  if (grupo === "Isquiotibiais") {
    if (lateral > 4.5) return "Bíceps_femoral";
    return y > 2 ? "Semitendinoso" : "Semimembranoso";
  }

  if (grupo === "Costas") {
    // Altura, e agora ela funciona. A primeira tentativa por altura deu Lombar
    // com 6 vértices, mas o culpado não era o eixo: dorsal e eretores chegam
    // colados numa ilha só, e classificar a ilha inteira pelo centroide dela
    // mandava a folha toda para um lado. Com o corte por triângulo, cada faixa
    // cai onde deve.
    if (z > 8) return "Trapézio";
    return z < -1 ? "Lombar" : "Dorsal";
  }

  if (grupo === "Peitoral") {
    // O peitoral maior é o par grande e frontal; o que sobra atrás dele, na
    // lateral da caixa torácica, é serrátil.
    return y > 0.5 ? "Serrátil" : "Peitoral_maior";
  }

  if (grupo === "Glúteos") {
    // O médio corre por fora e mais alto; o máximo é o volume posterior.
    return lateral > 4 ? "Glúteo_médio" : "Glúteo_máximo";
  }

  if (grupo === "Panturrilha") {
    // O gastrocnêmio é superficial (y≈4.0); o sóleo fica embaixo dele (y≈2.2).
    return y > 3.5 ? "Gastrocnêmio" : "Sóleo";
  }

  if (grupo === "Abdômen") {
    // O reto abdominal é a faixa central; os oblíquos abrem para os lados.
    return lateral > 3 ? "Oblíquos" : "Reto_abdominal";
  }

  if (grupo === "Antebraço") {
    // Flexores na face anterior, extensores na posterior. O braço está em
    // A-pose, então a fronteira é a mesma deslocada do resto do membro.
    return y > 3.5 ? "Extensores_do_antebraço" : "Flexores_do_antebraço";
  }

  // O braço se divide em **camadas de profundidade**, não por dentro e fora. As
  // oito ilhas do braço ficam todas em cima da linha central dele — o desvio
  // máximo é 0.47 —, então distância do eixo não separa nada. O que separa é
  // `y`, em quatro camadas: 2.9 anterior superficial, 3.6 anterior profundo,
  // 3.9 posterior, 4.5 posterior profundo.
  if (grupo === "Bíceps") {
    // **Não são as duas cabeças do bíceps.** Na superfície elas formam um
    // ventre só, e o écorché não as aparta. A camada de trás é o braquial, que
    // corre por baixo do bíceps — anatomia de verdade, e o que o modelo sabe
    // acender. Prometer "cabeça longa" e "cabeça curta" era oferecer uma
    // seleção que devolvia uma tira fina e o resto do braço.
    return y > 3.2 ? "Braquial" : "Bíceps";
  }

  if (grupo === "Tríceps") {
    // **Duas cabeças, não três.** A medial fica embaixo das outras duas e não
    // existe como peça separada. Aqui a profundidade separa melhor que a
    // largura: a cabeça longa é a mais posterior (y≈4.5), a lateral fica à
    // frente dela (y≈3.9).
    return y > 4.25 ? "Cabeça_longa_do_tríceps" : "Cabeça_lateral_do_tríceps";
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
function emitir(grupos, saida, MATERIAL_DA_ORIGEM) {
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

    // Um material por malha: compartilhado, mudar a cor de um mexeria em todos.
    //
    // As propriedades saem do material do écorché, não de um cinza inventado. É
    // o tom anatômico do original — `baseColorFactor [0.47, 0.257, 0.257]`, bem
    // avermelhado, com roughness 0.22 — e é ele que o corpo mostra quando não
    // há volume para pintar. Copiar em vez de escolher também deixa a troca do
    // modelo de origem trazer a cor dela junto, sem ninguém reajustar constante.
    const mat = materials.length;
    materials.push({ name: nome, pbrMetallicRoughness: { ...MATERIAL_DA_ORIGEM } });

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

/** O nome final de uma peça, a partir de um ponto qualquer dela. */
function nomeDoPonto(centro) {
  const grupo = grupoDoCentro(centro);
  return grupo === NEUTRO ? NEUTRO : subMusculo(grupo, centro);
}

/**
 * O que faz uma ilha ser cortada em vez de ir inteira para o voto majoritário.
 *
 * **Ilha é músculo, e a borda dela é a que o escultor fez.** Respeitar essa
 * borda é o que faz a seleção parecer um músculo aceso em vez de tinta jogada
 * por cima — e as faixas deste arquivo são fatias de coordenada, que não
 * seguem anatomia nenhuma. Cortar por elas estraga a peça.
 *
 * Só uma ilha do écorché cobre mesmo dois músculos: a folha toracolombar, com
 * 5.731 vértices, que junta dorsal e eretores num pedaço só. As demais ficam
 * abaixo de 2.800 e são músculo único, ainda que atravessem uma fronteira.
 *
 * Por isso o critério é **tamanho**, não discordância. Um limiar de
 * discordância cortava 144 das 299 ilhas — três quartos do modelo fatiado por
 * plano de coordenada — porque quase toda ilha longa cruza alguma fronteira sem
 * por isso deixar de ser um músculo só.
 */
const VERTICES_QUE_INDICAM_FUSAO = 3000;

/** E ainda assim só corta se os triângulos de fato discordarem. */
const DISCORDANCIA_MINIMA = 0.2;

const cortadas = [];

const centroDoTriangulo = (tri) => {
  const c = [0, 0, 0];
  for (const v of tri) {
    for (let k = 0; k < 3; k++) c[k] += dados.pos[v * 3 + k] / 3;
  }
  return c;
};

for (const ilha of dados.ilhas) {
  // Ilha grande do écorché costuma cobrir mais de um músculo: o dorsal e os
  // eretores, por exemplo, chegam **colados numa peça só** que vai de z=-6 a
  // z=9 com o centroide na linha média. Classificar essa ilha pelo centroide
  // dela mandava a folha inteira para um músculo — na tela, selecionar "Lombar"
  // acendia as costas quase todas e "Dorsal" acendia duas lascas.
  //
  // Então cada triângulo vota. Se a maioria é folgada, a ilha inteira vai para
  // o vencedor e o músculo continua com a borda que o escultor deu. Se a
  // discordância é grande, a ilha de fato cobre dois músculos e é cortada.
  const votos = new Map();
  for (const tri of ilha.tris) {
    const nome = nomeDoPonto(centroDoTriangulo(tri));
    votos.set(nome, (votos.get(nome) ?? 0) + 1);
  }

  const maioria = [...votos.values()].sort((a, c) => c - a)[0];
  const discordancia = 1 - maioria / ilha.tris.length;
  const corta =
    ilha.vertices.size > VERTICES_QUE_INDICAM_FUSAO && discordancia >= DISCORDANCIA_MINIMA;

  if (corta) cortadas.push(ilha.vertices.size);

  // Ilha inteira vai pelo **centroide dela**, não pelo voto dos triângulos. O
  // voto parecia mais fino e era pior: numa ilha centrada em y≈3.95, com os
  // triângulos espalhados meio ponto para cada lado, metade cai do outro lado
  // de uma fronteira em 4.25 — e o músculo inteiro migra para o vizinho. O
  // centroide é o que representa a peça; o voto só serve para descobrir que ela
  // cobre dois músculos.
  atribuir(ilha, corta ? null : nomeDoPonto(ilha.centro));
}

/** Manda os triângulos da ilha para o grupo — um nome fixo, ou um por triângulo. */
function atribuir(ilha, nomeFixo) {
  const vistos = new Set();

  for (const tri of ilha.tris) {
    const nome = nomeFixo ?? nomeDoPonto(centroDoTriangulo(tri));

    let g = porGrupo.get(nome);
    if (!g) {
      g = { posicoes: [], normais: [], indices: [], remap: new Map(), ilhas: 0 };
      porGrupo.set(nome, g);
    }
    if (!vistos.has(nome)) {
      vistos.add(nome);
      g.ilhas++;
    }

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
// O material do écorché viaja junto: é a cor anatômica do corpo em repouso.
const { gltf: origem } = carregar(ENTRADA);
emitir(ordem, SAIDA, origem.materials[0].pbrMetallicRoughness);

if (cortadas.length > 0) {
  console.log(`ilhas cortadas por cobrirem dois músculos: ${cortadas.join(", ")} vértices`);
  console.log("");
}

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
