"use client";

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_HINT,
  passwordValidationError,
  userFacingAuthError,
} from "@elevapro/shared";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { FormField } from "@/shared/components/ui/FormField";
import { Input } from "@/shared/components/ui/Input";
import { useCreateStudent } from "../hooks/useCreateStudent";

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStudentModal({ isOpen, onClose }: CreateStudentModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createStudent = useCreateStudent();

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(false);
    createStudent.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const passwordError = passwordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      await createStudent.mutateAsync({ fullName, email, password });
      setSuccess(true);
    } catch (err) {
      setError(userFacingAuthError(err));
    }
  };

  if (success) {
    return (
      <Dialog open={isOpen} onClose={handleClose} title="Aluno Criado!">
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
            <strong className="text-foreground">{fullName}</strong> foi cadastrado com sucesso. As
            credenciais de acesso foram enviadas para{" "}
            <strong className="text-foreground">{email}</strong>.
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
      description="Cadastre um aluno criando o acesso dele ao app."
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

        <FormField label="Senha" htmlFor="password" hint={PASSWORD_REQUIREMENTS_HINT}>
          <Input
            id="password"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder={PASSWORD_REQUIREMENTS_HINT}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

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
            {createStudent.isPending ? "Criando..." : "Criar Aluno"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
