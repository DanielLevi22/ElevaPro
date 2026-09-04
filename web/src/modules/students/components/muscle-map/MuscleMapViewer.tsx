"use client";

import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Canvas, useFrame } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MuscleVolume } from "@/shared/hooks/useWorkoutMetrics";
import { CORPO_NEUTRO, escalaDeCor, SEM_DADO, type TomDoMusculo } from "./escalaDeCor";
import { MALHA_NEUTRA, volumePorMalha } from "./grupos";

/**
 * O corpo 3D, pintado por nome de malha.
 *
 * **Não há mapeamento neste arquivo, e é essa ausência que importa.** Até
 * 2026-09-03 existia um `MUSCLE_MESH_MAP` que ligava "Peitoral" a
 * `object_0, object_1, object_27, object_83, object_84` — nomes escolhidos por
 * centroide de caixa delimitadora, porque o écorché de origem exporta 87 malhas
 * sem semântica. A medição depois mostrou por que aquilo nunca acertava: 48
 * dessas malhas ocupam mais de metade do corpo, e a menor ocupa 21%. Pintar uma
 * delas tingia quase o boneco inteiro.
 *
 * O modelo agora vem de `scripts/modelo/reagrupar.js`, que reagrupa a geometria
 * por conectividade e emite malhas chamadas `Peitoral`, `Costas`, `Quadríceps`.
 * A malha se chama pelo que ela é, então pintar é procurar pelo nome.
 */

const MODELO = "/models/corpo-por-musculo.glb";

interface MusculoSobMouse {
  muscle: string;
  volume: number;
  pct: number;
}

interface CorpoProps {
  tons: Map<string, TomDoMusculo>;
  onHover: (info: MusculoSobMouse | null) => void;
  onSelect: (muscle: string | null) => void;
  selectedMuscle: string | null;
  volumeByMuscle: MuscleVolume[];
}

function Corpo({ tons, onHover, onSelect, selectedMuscle, volumeByMuscle }: CorpoProps) {
  const { scene } = useGLTF(MODELO);
  const total = volumeByMuscle.reduce((s, m) => s + m.volume, 0);

  // `useGLTF` cacheia a cena entre montagens: pintar a original vazaria a cor
  // de um render para o próximo.
  const cena = useMemo(() => scene.clone(true), [scene]);

  // Materiais isolados uma vez: o clone compartilha as instâncias, então sem
  // isto pintar um músculo pintaria todos.
  useEffect(() => {
    cena.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = (obj.material as THREE.Material).clone();
      }
    });
  }, [cena]);

  useEffect(() => {
    cena.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const material = obj.material as THREE.MeshStandardMaterial;
      const neutra = obj.name === MALHA_NEUTRA;
      const tom = neutra ? undefined : tons.get(obj.name);

      material.color = new THREE.Color(neutra ? CORPO_NEUTRO : (tom?.cor ?? SEM_DADO));

      // O selecionado brilha em vez de mudar de cor: trocar a cor apagaria a
      // informação de volume justamente no músculo que a pessoa foi olhar.
      // Fora da seleção, o brilho é o próprio volume — o mais carregado acende
      // mais, que é o que faz o mapa ser lido de relance.
      const aceso = !neutra && obj.name === selectedMuscle;
      material.emissive = new THREE.Color(aceso ? "#ffffff" : (tom?.cor ?? "#000000"));
      material.emissiveIntensity = aceso ? 0.5 : (tom?.brilho ?? 0);
      material.needsUpdate = true;
    });
  }, [cena, tons, selectedMuscle]);

  function musculoDoEvento(e: ThreeEvent<PointerEvent | MouseEvent>): string | null {
    const nome = (e.object as THREE.Mesh).name;
    return nome && nome !== MALHA_NEUTRA ? nome : null;
  }

  return (
    <primitive
      object={cena}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const musculo = musculoDoEvento(e);
        onSelect(musculo && musculo !== selectedMuscle ? musculo : null);
      }}
      onPointerOut={() => onHover(null)}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const musculo = musculoDoEvento(e);
        if (!musculo) return;
        const volume = volumeByMuscle.find((m) => m.muscle === musculo)?.volume ?? 0;
        onHover({
          muscle: musculo,
          volume,
          pct: total > 0 ? Math.round((volume / total) * 100) : 0,
        });
      }}
      // O modelo é Z-up (padrão do Blender); o three.js é Y-up.
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}

/** Fallback girando, para o caso de o modelo não carregar. */
function CorpoDeEspera() {
  const grupo = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (grupo.current) grupo.current.rotation.y += delta * 0.3;
  });

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: CORPO_NEUTRO, roughness: 0.9 }),
    [],
  );

  return (
    <group ref={grupo}>
      <mesh material={material} position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
      </mesh>
      <mesh material={material} position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.19, 0.6, 8, 16]} />
      </mesh>
      <Html center position={[0, -0.75, 0]}>
        <div className="whitespace-nowrap rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-muted-foreground text-xs">
          Não consegui carregar <code className="text-primary">{MODELO}</code>
        </div>
      </Html>
    </group>
  );
}

class LimiteDeErro extends Component<
  { children: ReactNode; fallback: ReactNode },
  { falhou: boolean }
> {
  state = { falhou: false };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  render() {
    return this.state.falhou ? this.props.fallback : this.props.children;
  }
}

interface MuscleMapViewerProps {
  volumeByMuscle: MuscleVolume[];
  selectedMuscle: string | null;
  onMuscleSelect: (muscle: string | null) => void;
}

export function MuscleMapViewer({
  volumeByMuscle,
  selectedMuscle,
  onMuscleSelect,
}: MuscleMapViewerProps) {
  // O volume chega com a chave do banco (`peito`, `pernas`); as malhas se chamam
  // `Peitoral`, `Quadríceps`. Sem esta tradução nada casa e o corpo fica cinza.
  const porMalha = useMemo(() => volumePorMalha(volumeByMuscle), [volumeByMuscle]);
  const tons = useMemo(() => escalaDeCor(porMalha), [porMalha]);
  const [sobMouse, setSobMouse] = useState<MusculoSobMouse | null>(null);

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0, 95], fov: 42 }}>
        <ambientLight intensity={0.9} />
        <directionalLight intensity={1.4} position={[30, 40, 60]} />
        <directionalLight intensity={0.5} position={[-40, 10, -30]} />
        <Suspense fallback={null}>
          <LimiteDeErro fallback={<CorpoDeEspera />}>
            <Corpo
              tons={tons}
              onHover={setSobMouse}
              onSelect={onMuscleSelect}
              selectedMuscle={selectedMuscle}
              volumeByMuscle={porMalha}
            />
          </LimiteDeErro>
        </Suspense>
        <OrbitControls enablePan={false} maxDistance={170} minDistance={45} />
      </Canvas>

      {sobMouse && (
        <div className="pointer-events-none absolute top-4 left-4 rounded-lg border border-white/10 bg-surface px-3 py-2">
          <p className="font-bold text-sm text-white">{sobMouse.muscle}</p>
          <p className="text-muted-foreground text-xs">
            {sobMouse.volume.toLocaleString("pt-BR")} kg · {sobMouse.pct}% do volume
          </p>
        </div>
      )}
    </div>
  );
}

useGLTF.preload(MODELO);
