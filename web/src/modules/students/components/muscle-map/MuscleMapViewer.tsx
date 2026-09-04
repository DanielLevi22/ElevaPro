"use client";

import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MuscleVolume } from "@/shared/hooks/useWorkoutMetrics";
import { escalaDeCor, type TomDoMusculo } from "./escalaDeCor";
import { MALHA_NEUTRA, malhasAcesas, rotuloDaMalha } from "./grupos";

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

/**
 * Gira devagar enquanto ninguém interage, e para no primeiro toque.
 *
 * É o que separa uma cena de uma foto: sem movimento nenhum o corpo parece
 * colado no fundo. Parar de vez ao interagir é obrigatório — girar por baixo de
 * quem está tentando mirar um músculo é pior que não girar.
 */
function GiroEmRepouso({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  const grupo = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ativo && grupo.current) grupo.current.rotation.y += delta * 0.12;
  });
  return <group ref={grupo}>{children}</group>;
}

/** O pedaço do OrbitControls que a virada usa. Tipar só isto evita o `any`. */
interface ControleOrbital {
  getAzimuthalAngle: () => number;
  setAzimuthalAngle: (angulo: number) => void;
}

/**
 * Leva a câmera até um ângulo, animando.
 *
 * Existe porque metade do treino é cadeia posterior e, sem isto, chegar às
 * costas exige arrastar até acertar. O giro contínuo também dá noção de que o
 * corpo é um só — um corte seco de frente para costas parece troca de imagem.
 *
 * A diferença é normalizada para (−π, π] para a câmera pegar sempre o caminho
 * curto; sem isso, virar de 170° para −170° daria uma volta quase completa.
 */
function GiraCameraPara({ alvo }: { alvo: number | null }) {
  const controles = useThree((s) => s.controls) as ControleOrbital | null;

  useFrame((_, delta) => {
    if (alvo === null || !controles?.setAzimuthalAngle) return;

    const atual = controles.getAzimuthalAngle();
    const dif = ((alvo - atual + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (Math.abs(dif) < 0.005) return;

    controles.setAzimuthalAngle(atual + dif * Math.min(1, delta * 4));
  });

  return null;
}

function Corpo({ tons, onHover, onSelect, selectedMuscle, volumeByMuscle }: CorpoProps) {
  const { scene } = useGLTF(MODELO);
  const total = volumeByMuscle.reduce((s, m) => s + m.volume, 0);

  // `useGLTF` cacheia a cena entre montagens: pintar a original vazaria a cor
  // de um render para o próximo.
  const cena = useMemo(() => scene.clone(true), [scene]);

  // Materiais isolados uma vez: o clone compartilha as instâncias, então sem
  // isto pintar um músculo pintaria todos.
  // A cor que o modelo traz, guardada antes de qualquer pintura. É para onde o
  // músculo volta quando o período não tem treino nenhum — sem ela, uma vez
  // pintado o músculo nunca mais recuperava o tom anatômico.
  const corDeRepouso = useRef(new Map<string, THREE.Color>());

  useEffect(() => {
    cena.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const material = (obj.material as THREE.MeshStandardMaterial).clone();
      obj.material = material;
      corDeRepouso.current.set(obj.uuid, material.color.clone());
    });
  }, [cena]);

  const acesas = useMemo(() => malhasAcesas(selectedMuscle), [selectedMuscle]);

  useEffect(() => {
    cena.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const material = obj.material as THREE.MeshStandardMaterial;
      const neutra = obj.name === MALHA_NEUTRA;
      const tom = neutra ? undefined : tons.get(obj.name);

      // Sem volume, a cor **não é tocada**: fica o tom anatômico que o écorché
      // traz no próprio material. Repintar de cinza, como eu fazia, jogava fora
      // a aparência de corpo que o modelo já dava de graça.
      if (tom) material.color = new THREE.Color(tom.cor);
      else material.color.copy(corDeRepouso.current.get(obj.uuid) ?? material.color);

      // O selecionado brilha em vez de mudar de cor: trocar a cor apagaria a
      // informação de volume justamente no músculo que a pessoa foi olhar.
      // Fora da seleção, o brilho é o próprio volume — o mais carregado acende
      // mais, que é o que faz o mapa ser lido de relance.
      // A seleção pode ser um grupo ("Costas") ou um sub-músculo ("Dorsal").
      // Grupo acende todas as malhas dele; sub-músculo acende só a sua.
      const aceso = !neutra && acesas.has(obj.name);
      // O selecionado clareia a **cor**, não só o brilho. Só emissivo a 0.22 era
      // invisível num músculo pequeno visto de longe, e a 0.5 estourava a peça
      // e apagava a informação de volume junto. Clarear a base resolve os dois:
      // lê de relance e não queima.
      if (aceso) material.color.lerp(new THREE.Color("#ffffff"), 0.45);
      material.emissive = new THREE.Color(aceso ? "#ffffff" : (tom?.cor ?? "#000000"));
      material.emissiveIntensity = aceso ? 0.25 : (tom?.brilho ?? 0);
      material.needsUpdate = true;
    });
  }, [cena, tons, acesas]);

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

  // O mesmo avermelhado anatômico do écorché, para o fallback não destoar do
  // corpo de verdade quando o modelo demora ou falha.
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b68b8b", roughness: 0.9 }),
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
  const tons = useMemo(() => escalaDeCor(volumeByMuscle), [volumeByMuscle]);
  const [sobMouse, setSobMouse] = useState<MusculoSobMouse | null>(null);
  const [emRepouso, setEmRepouso] = useState(true);
  const [vista, setVista] = useState<"frente" | "costas" | null>("frente");

  return (
    <div
      className="relative h-full w-full"
      onPointerDown={() => {
        setEmRepouso(false);
        // Arrastar solta a câmera: continuar puxando para o ângulo do botão
        // brigaria com a mão de quem está girando.
        setVista(null);
      }}
      onWheel={() => setEmRepouso(false)}
    >
      <Canvas camera={{ position: [0, 0, 95], fov: 42 }} shadows>
        {/* Três luzes com papéis distintos: a ambiente levanta as sombras, a
            principal modela o volume, e a de trás recorta a silhueta contra o
            fundo — é ela que faz o corpo descolar do preto. */}
        <ambientLight intensity={0.55} />
        <directionalLight intensity={1.5} position={[35, 45, 55]} />
        <directionalLight color="#9fb4ff" intensity={0.9} position={[-45, 25, -55]} />

        <Suspense fallback={null}>
          <LimiteDeErro fallback={<CorpoDeEspera />}>
            <GiroEmRepouso ativo={emRepouso && !selectedMuscle}>
              <Corpo
                tons={tons}
                onHover={setSobMouse}
                onSelect={onMuscleSelect}
                selectedMuscle={selectedMuscle}
                volumeByMuscle={volumeByMuscle}
              />
            </GiroEmRepouso>
          </LimiteDeErro>
        </Suspense>

        {/* A sombra de contato é o que ancora o corpo: sem ela ele parece
            recortado e colado no fundo, não de pé num lugar. */}
        <ContactShadows blur={2.6} far={30} opacity={0.55} position={[0, -44, 0]} scale={120} />

        <GiraCameraPara alvo={vista === "frente" ? 0 : vista === "costas" ? Math.PI : null} />

        <OrbitControls
          autoRotate={false}
          enablePan={false}
          makeDefault
          maxDistance={190}
          minDistance={40}
          target={[0, -8, 0]}
        />
      </Canvas>

      {/* Vinheta: escurece as bordas e empurra o olho para o centro. Não recebe
          ponteiro, senão engoliria o clique no corpo. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <button
        className="absolute right-6 bottom-6 rounded-full border border-border bg-surface/70 px-4 py-2 font-bold text-[11px] text-muted-foreground uppercase tracking-widest backdrop-blur-md transition-colors hover:text-foreground"
        onClick={() => {
          setEmRepouso(false);
          setVista(vista === "costas" ? "frente" : "costas");
        }}
        type="button"
      >
        {vista === "costas" ? "Ver de frente" : "Ver de costas"}
      </button>

      {sobMouse && (
        <div className="pointer-events-none absolute top-6 left-6 rounded-xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md">
          <p className="font-bold text-sm text-white">{rotuloDaMalha(sobMouse.muscle)}</p>
          <p className="text-white/50 text-xs">
            {sobMouse.volume.toLocaleString("pt-BR")} kg · {sobMouse.pct}% do volume
          </p>
        </div>
      )}
    </div>
  );
}

useGLTF.preload(MODELO);
