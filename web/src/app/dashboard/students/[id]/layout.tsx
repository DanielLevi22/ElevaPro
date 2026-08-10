import { StudentDetailShell } from "@/modules/students/components/StudentDetailShell";

/**
 * Cabeçalho e abas do aluno vivem no layout para sobreviverem à navegação entre
 * as seções — era o fluxo de sair da tela e voltar para alcançar a próxima.
 */
export default function StudentDetailLayout({ children }: { children: React.ReactNode }) {
  return <StudentDetailShell>{children}</StudentDetailShell>;
}
