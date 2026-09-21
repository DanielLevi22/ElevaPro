import type { ServiceType } from '@elevapro/shared';
import { useCallback, useMemo, useState } from 'react';

/**
 * As etapas do cadastro de um aluno pelo especialista, fora da tela.
 *
 * Só duas etapas: dados + tipo de acompanhamento, e a confirmação do convite.
 * A anamnese saiu do fluxo (issue #332) — quem responde é o próprio aluno, no
 * primeiro acesso, não o especialista em nome dele.
 *
 * O seletor de serviço só aceita o que `servicosOferecidos` lista: a mesma
 * trava que o BFF aplica do lado do servidor, aqui do lado do formulário, para
 * a opção inválida nem chegar a ser marcada.
 *
 * @example
 * const cadastro = useCadastroDeAluno({ servicosOferecidos: ['personal_training'] });
 * if (!cadastro.impedimento) await enviarConvite(cadastro);
 */
export type EtapaDoCadastroDeAluno = 'dados' | 'convite';

type UseCadastroDeAlunoParams = {
  servicosOferecidos: ServiceType[];
};

type CadastroDeAluno = {
  etapa: EtapaDoCadastroDeAluno;
  fullName: string;
  setFullName: (valor: string) => void;
  email: string;
  setEmail: (valor: string) => void;
  serviceTypes: ServiceType[];
  alternarServico: (servico: ServiceType) => void;
  /** Por que não dá para enviar o convite agora, ou `null` quando dá. */
  impedimento: string | null;
  studentId: string | null;
  concluirConvite: (studentId: string) => void;
};

export function useCadastroDeAluno({
  servicosOferecidos,
}: UseCadastroDeAlunoParams): CadastroDeAluno {
  const [etapa, setEtapa] = useState<EtapaDoCadastroDeAluno>('dados');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  const alternarServico = useCallback(
    (servico: ServiceType) => {
      if (!servicosOferecidos.includes(servico)) return;
      setServiceTypes((atuais) =>
        atuais.includes(servico) ? atuais.filter((s) => s !== servico) : [...atuais, servico]
      );
    },
    [servicosOferecidos]
  );

  const impedimento = useMemo(() => {
    if (!fullName.trim() || !email.trim() || serviceTypes.length === 0) {
      return 'Preencha nome, e-mail e o tipo de acompanhamento.';
    }
    return null;
  }, [fullName, email, serviceTypes.length]);

  const concluirConvite = useCallback((novoStudentId: string) => {
    setStudentId(novoStudentId);
    setEtapa('convite');
  }, []);

  return {
    etapa,
    fullName,
    setFullName,
    email,
    setEmail,
    serviceTypes,
    alternarServico,
    impedimento,
    studentId,
    concluirConvite,
  };
}
