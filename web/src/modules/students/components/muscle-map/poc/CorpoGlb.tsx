"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * O corpo 3D reagrupado, pintado por nome de malha.
 *
 * Diferença para o `MuscleMapViewer` de hoje: lá as malhas se chamam
 * `Object_0..Object_86` e o de-para saía de centroide de caixa delimitadora —
 * 48 das 87 malhas ocupam mais de metade do corpo, então pintar uma delas
 * tingia quase o boneco inteiro.
 *
 * Aqui o `scripts/modelo/reagrupar.js` já resolveu isso em tempo de build: a
 * malha se chama `Peitoral`, e pintar `Peitoral` pinta o peitoral. **Não existe
 * mapeamento neste arquivo** — é essa ausência que prova o ponto.
 *
 * Modelo derivado de "Ecorché practice" de martinjario, CC BY 4.0 — ver
 * NOTICE.md.
 */

const MODELO = "/models/corpo-por-musculo.glb";

/** O tom do corpo onde não há grupo treinável: cabeça, mãos, pés, esqueleto. */
const CORPO_NEUTRO = "#3f3f46";

function Corpo({
  corPorGrupo,
  corSemDado,
}: {
  corPorGrupo: Map<string, string>;
  corSemDado: string;
}) {
  const { scene } = useGLTF(MODELO);

  // Clona porque `useGLTF` cacheia a cena entre montagens: pintar a original
  // vazaria a cor de um render para o próximo.
  const cena = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cena.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const cor = obj.name === "Corpo" ? CORPO_NEUTRO : (corPorGrupo.get(obj.name) ?? corSemDado);

      // Material próprio por malha: o GLB já traz um por grupo, mas o clone
      // compartilha as instâncias — sem isolar, pintar um pinta todos.
      const material = (obj.material as THREE.MeshStandardMaterial).clone();
      material.color = new THREE.Color(cor);
      material.roughness = 0.85;
      material.metalness = 0;
      obj.material = material;
    });
  }, [cena, corPorGrupo, corSemDado]);

  return <primitive object={cena} />;
}

export function CorpoGlb({
  corPorGrupo,
  corSemDado,
}: {
  corPorGrupo: Map<string, string>;
  corSemDado: string;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 95], fov: 42 }} style={{ height: 520 }}>
      <ambientLight intensity={0.9} />
      <directionalLight intensity={1.4} position={[30, 40, 60]} />
      <directionalLight intensity={0.5} position={[-40, 10, -30]} />
      <Suspense fallback={null}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Corpo corPorGrupo={corPorGrupo} corSemDado={corSemDado} />
        </group>
      </Suspense>
      <OrbitControls enablePan={false} maxDistance={160} minDistance={50} />
    </Canvas>
  );
}

useGLTF.preload(MODELO);
