import type { ServiceType } from '@elevapro/shared';
import { useCallback, useMemo, useState } from 'react';

/**
 * As etapas do cadastro de um aluno pelo especialista, fora da tela.
 *
 * Só duas etapas: dados + tipo de acompanhamento, e a confirmação do convite.
 * A anamnese saiu do fluxo (issue #332) — quem responde é o próprio aluno, no
 * primeiro acesso, não o especialista em nome dele.
 *
 * O seletor de serviço só aceita o que `offeredServices` lista: a mesma
 * trava que o BFF aplica do lado do servidor, aqui do lado do formulário, para
 * a opção inválida nem chegar a ser marcada.
 *
 * @example
 * const registration = useStudentRegistration({ offeredServices: ['personal_training'] });
 * if (!registration.blockingReason) await sendInvite(registration);
 */
export type StudentRegistrationStep = 'data' | 'invite';

type UseStudentRegistrationParams = {
  offeredServices: ServiceType[];
};

type StudentRegistration = {
  step: StudentRegistrationStep;
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  serviceTypes: ServiceType[];
  toggleService: (service: ServiceType) => void;
  /** Por que não dá para enviar o convite agora, ou `null` quando dá. */
  blockingReason: string | null;
  studentId: string | null;
  completeInvite: (studentId: string) => void;
};

export function useStudentRegistration({
  offeredServices,
}: UseStudentRegistrationParams): StudentRegistration {
  const [step, setStep] = useState<StudentRegistrationStep>('data');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  const toggleService = useCallback(
    (service: ServiceType) => {
      if (!offeredServices.includes(service)) return;
      setServiceTypes((current) =>
        current.includes(service) ? current.filter((s) => s !== service) : [...current, service]
      );
    },
    [offeredServices]
  );

  const blockingReason = useMemo(() => {
    if (!fullName.trim() || !email.trim() || serviceTypes.length === 0) {
      return 'Preencha nome, e-mail e o tipo de acompanhamento.';
    }
    return null;
  }, [fullName, email, serviceTypes.length]);

  const completeInvite = useCallback((newStudentId: string) => {
    setStudentId(newStudentId);
    setStep('invite');
  }, []);

  return {
    step,
    fullName,
    setFullName,
    email,
    setEmail,
    serviceTypes,
    toggleService,
    blockingReason,
    studentId,
    completeInvite,
  };
}
