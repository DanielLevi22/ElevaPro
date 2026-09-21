"use client";

import type { ServiceType } from "@elevapro/shared";
import { userFacingAuthError } from "@elevapro/shared";
import { useState } from "react";
import { useAuthStore } from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { FormField } from "@/shared/components/ui/FormField";
import { Input } from "@/shared/components/ui/Input";
import { useCreateStudent } from "../hooks/useCreateStudent";

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROTULO: Record<ServiceType, string> = {
  personal_training: "Treino",
  nutrition_consulting: "Nutrição",
};

export function CreateStudentModal({ isOpen, onClose }: CreateStudentModalProps) {
  const user = useAuthStore((state) => state.user);
  const servicosOferecidos = useAuthStore((state) => state.services) as ServiceType[];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createStudent = useCreateStudent();

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setServiceTypes([]);
    setError(null);
    setSuccess(false);
    createStudent.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const alternarServico = (servico: ServiceType) => {
    setServiceTypes((atuais) =>
      atuais.includes(servico) ? atuais.filter((s) => s !== servico) : [...atuais, servico],
    );
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (serviceTypes.length === 0) {
      setError("Selecione pelo menos um tipo de acompanhamento.");
      return;
    }
    if (!user?.id) {
      setError("Usuário não autenticado.");
      return;
    }

    try {
      await createStudent.mutateAsync({ specialistId: user.id, fullName, email, serviceTypes });
      setSuccess(true);
    } catch (err) {
      setError(userFacingAuthError(err));
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onClose={handleClose} title="Convite enviado!">
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-7 h-7 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">{fullName}</strong> recebeu o convite em{" "}
            <strong className="text-foreground">{email}</strong>. Ele entra no app e define a
            própria senha — sem custo e sem que você a conheça.
          </p>
          <Button fullWidth onClick={handleClose}>
            Concluir
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="Novo Aluno"
      description="Convide um aluno para criar o acesso dele ao app."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome Completo" htmlFor="fullName">
          <Input
            id="fullName"
            required
            placeholder="Ex: João Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            placeholder="joao@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-foreground mb-1.5">
            Tipo de acompanhamento
          </legend>
          {servicosOferecidos.map((servico) => (
            <label
              key={servico}
              className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer"
            >
              <input
                type="checkbox"
                checked={serviceTypes.includes(servico)}
                onChange={() => alternarServico(servico)}
                className="h-4 w-4 rounded border-border"
              />
              {ROTULO[servico]}
            </label>
          ))}
          {servicosOferecidos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum serviço configurado no seu perfil ainda.
            </p>
          )}
        </fieldset>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" fullWidth onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" fullWidth isLoading={createStudent.isPending}>
            {createStudent.isPending ? "Enviando..." : "Enviar Convite"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
