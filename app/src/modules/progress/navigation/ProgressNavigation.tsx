import type { Href } from 'expo-router';
import { createContext, type ReactNode, useContext } from 'react';
import { ROUTES } from '@/navigation/types';
import type { ProgressSegment } from '../screens/ProgressScreen';

/**
 * Quem está olhando o Progresso, e para onde as telas dele navegam.
 *
 * O fluxo nasceu na aba do aluno, com as rotas dela escritas em cada tela. O
 * especialista abre o mesmo fluxo pelo "Evolução geral" do Acompanhamento
 * (#334), mas dentro da pilha de Alunos: a aba Progresso nem existe para ele, e
 * navegar de uma aba para a outra quebraria o voltar. Então as telas perguntam o
 * destino aqui, e cada lado monta o seu.
 *
 * Sem provedor, vale o aluno olhando o próprio progresso — a aba dele não muda.
 *
 * @example
 * const { routes } = useProgressNavigation();
 * router.push(routes.loads);
 */
export interface ProgressRoutes {
  home: (segment?: ProgressSegment) => Href;
  loads: Href;
  body: Href;
  circumferences: Href;
  compare: Href;
  measurements: Href;
  report: Href;
  /** Corrigir a medida declarada é direito do titular (Art. 18, III): `null` para o especialista. */
  measurementForm: ((id?: string) => Href) | null;
  /** O histórico onde o aluno corrige as próprias sessões; `null` para o especialista. */
  sessionHistory: Href | null;
}

export interface ProgressNavigation {
  viewer: 'self' | 'specialist';
  /** O nome do aluno nos títulos, quando quem olha é o especialista. */
  studentName: string | null;
  /** O voltar do hub, que na aba do aluno é raiz e não tem para onde voltar. */
  onBack: (() => void) | null;
  routes: ProgressRoutes;
}

const SELF: ProgressNavigation = {
  viewer: 'self',
  studentName: null,
  onBack: null,
  routes: {
    home: (segment) =>
      segment ? { pathname: ROUTES.PROGRESS.HOME, params: { segment } } : ROUTES.PROGRESS.HOME,
    loads: ROUTES.PROGRESS.LOADS,
    body: ROUTES.PROGRESS.BODY,
    circumferences: ROUTES.PROGRESS.CIRCUMFERENCES,
    compare: ROUTES.PROGRESS.COMPARE,
    measurements: ROUTES.PROGRESS.MEASUREMENTS,
    report: ROUTES.PROGRESS.REPORT,
    measurementForm: (id) =>
      id
        ? { pathname: ROUTES.PROGRESS.MEASUREMENT_FORM, params: { id } }
        : ROUTES.PROGRESS.MEASUREMENT_FORM,
    sessionHistory: ROUTES.STUDENT.SESSION_HISTORY,
  },
};

const Context = createContext<ProgressNavigation>(SELF);

/**
 * O Progresso de um aluno visto pelo especialista vinculado.
 *
 * @example
 * <SpecialistProgressProvider studentId={id} studentName={aluno.full_name} onBack={router.back}>
 *   <Stack />
 * </SpecialistProgressProvider>
 */
export function SpecialistProgressProvider({
  studentId,
  studentName,
  onBack,
  children,
}: {
  studentId: string;
  studentName: string | null;
  onBack: () => void;
  children: ReactNode;
}) {
  const routes = ROUTES.STUDENTS.PROGRESS;
  const value: ProgressNavigation = {
    viewer: 'specialist',
    studentName,
    onBack,
    routes: {
      home: (segment) => routes.HOME(studentId, segment),
      loads: routes.LOADS(studentId),
      body: routes.BODY(studentId),
      circumferences: routes.CIRCUMFERENCES(studentId),
      compare: routes.COMPARE(studentId),
      measurements: routes.MEASUREMENTS(studentId),
      report: routes.REPORT(studentId),
      measurementForm: null,
      sessionHistory: null,
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProgressNavigation(): ProgressNavigation {
  return useContext(Context);
}
