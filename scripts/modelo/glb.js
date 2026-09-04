// Núcleo compartilhado: lê o GLB, solda vértices e devolve as ilhas conectadas.
const fs = require("node:fs");

const TAM = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function carregar(caminho) {
  const b = fs.readFileSync(caminho);
  const jsonLen = b.readUInt32LE(12);
  const gltf = JSON.parse(b.slice(20, 20 + jsonLen).toString("utf8"));
  const bin = b.slice(20 + jsonLen + 8);
  return { gltf, bin };
}

function lerAcessor(gltf, bin, idx) {
  const a = gltf.accessors[idx];
  const bv = gltf.bufferViews[a.bufferView];
  const comp = COMP[a.type];
  const passo = bv.byteStride || TAM[a.componentType] * comp;
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float64Array(a.count * comp);
  for (let i = 0; i < a.count; i++) {
    for (let c = 0; c < comp; c++) {
      const o = base + i * passo + c * TAM[a.componentType];
      out[i * comp + c] =
        a.componentType === 5126
          ? bin.readFloatLE(o)
          : a.componentType === 5125
            ? bin.readUInt32LE(o)
            : a.componentType === 5123
              ? bin.readUInt16LE(o)
              : bin.readUInt8(o);
    }
  }
  return out;
}

/** Ilhas conectadas do modelo inteiro, com centroide, caixa e contagem. */
function segmentar(caminho, minVertices = 20) {
  const { gltf, bin } = carregar(caminho);

  const mapa = new Map();
  const pos = [];
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

  function no(x, y, z) {
    const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let i = mapa.get(k);
    if (i === undefined) {
      i = pos.length;
      mapa.set(k, i);
      pos.push([x, y, z]);
      pai.push(i);
    }
    return i;
  }

  // Guarda de qual malha original cada ilha veio, para rastreabilidade.
  const origem = new Map();

  for (let mi = 0; mi < gltf.meshes.length; mi++) {
    for (const p of gltf.meshes[mi].primitives) {
      const P = lerAcessor(gltf, bin, p.attributes.POSITION);
      const I = p.indices !== undefined ? lerAcessor(gltf, bin, p.indices) : null;
      const local = [];
      for (let i = 0; i < P.length / 3; i++) {
        const n = no(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
        local.push(n);
        if (!origem.has(n)) origem.set(n, mi);
      }
      const total = I ? I.length : local.length;
      for (let t = 0; t < total; t += 3) {
        const a = local[I ? I[t] : t],
          c = local[I ? I[t + 1] : t + 1],
          d = local[I ? I[t + 2] : t + 2];
        une(a, c);
        une(c, d);
      }
    }
  }

  const acc = new Map();
  for (let i = 0; i < pos.length; i++) {
    const r = acha(i);
    let e = acc.get(r);
    if (!e) {
      e = {
        raiz: r,
        n: 0,
        soma: [0, 0, 0],
        lo: [1e9, 1e9, 1e9],
        hi: [-1e9, -1e9, -1e9],
        meshes: new Set(),
      };
      acc.set(r, e);
    }
    e.n++;
    e.meshes.add(origem.get(i));
    for (let k = 0; k < 3; k++) {
      e.soma[k] += pos[i][k];
      e.lo[k] = Math.min(e.lo[k], pos[i][k]);
      e.hi[k] = Math.max(e.hi[k], pos[i][k]);
    }
  }

  const ilhas = [...acc.values()]
    .filter((e) => e.n >= minVertices)
    .map((e) => ({ ...e, centro: e.soma.map((s) => s / e.n) }));

  const lo = [0, 1, 2].map((k) => Math.min(...ilhas.map((e) => e.lo[k])));
  const hi = [0, 1, 2].map((k) => Math.max(...ilhas.map((e) => e.hi[k])));

  return { ilhas, corpo: { lo, hi, tam: [0, 1, 2].map((k) => hi[k] - lo[k]) } };
}

module.exports = { segmentar, carregar, lerAcessor };
