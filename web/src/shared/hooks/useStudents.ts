"use client";

import { createStudentsService } from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export type { Student } from "@elevapro/shared";

const studentsService = createStudentsService(supabase);

export function useStudents() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const query = useQuery({
    queryKey: ["students", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { students } = await studentsService.fetchStudents(userId, { limit: 200 });
      return students;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  // Enquanto o `getUser` não responde, a consulta fica desabilitada — e
  // consulta desabilitada não está carregando: o React Query reporta
  // `isLoading: false` com `data` vazio. Quem lê isso conclui "não há alunos"
  // no único instante em que ainda não dava para saber, e a tela de detalhe
  // chegava a dizer "Aluno não encontrado" para um aluno que existe.
  return { ...query, isLoading: query.isLoading || !userId };
}

/**
 * Um aluno, buscado por id.
 *
 * A tela de detalhe procurava o aluno dentro da listagem, que pagina: com mais
 * de 200 alunos, o de número 201 não abria. São perguntas diferentes — "quais
 * são meus alunos" pagina, "quem é este aluno" não.
 *
 * `null` significa "não é seu, ou não existe"; `undefined` significa "ainda não
 * sei". A tela precisa dos dois separados para não negar o aluno enquanto a
 * resposta não chegou, que foi o defeito da #245.
 */
export function useStudent(studentId: string | undefined) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const query = useQuery({
    queryKey: ["student", userId, studentId],
    queryFn: async () => {
      if (!userId || !studentId) return null;
      return studentsService.fetchStudentById(userId, studentId);
    },
    enabled: !!userId && !!studentId,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  // Mesma razão do `useStudents`: consulta desabilitada não está carregando, e
  // quem lesse `isLoading: false` com `data` indefinido concluiria ausência no
  // instante em que ainda não dava para saber.
  return { ...query, isLoading: query.isLoading || !userId || !studentId };
}

export function useSpecialistServices() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  return useQuery({
    queryKey: ["specialist_services", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("specialist_services")
        .select("service_type")
        .eq("specialist_id", userId);

      if (error) throw error;
      return data.map((s) => s.service_type);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

// Fluxo B: aluno existente fornece código ao especialista
export function useFindStudentByCode() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from("student_link_codes")
        .select("student_id, expires_at, student:profiles!student_id(id, full_name, email)")
        .eq("code", code.trim().toUpperCase())
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) return null;

      const student = Array.isArray(data.student) ? data.student[0] : data.student;
      return student as { id: string; full_name: string | null; email: string } | null;
    },
  });
}

// Vincula aluno ao especialista usando código de vínculo
export function useLinkStudentByCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      serviceType,
    }: {
      code: string;
      serviceType: "personal_training" | "nutrition_consulting";
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: linkCode, error: codeError } = await supabase
        .from("student_link_codes")
        .select("student_id")
        .eq("code", code.trim().toUpperCase())
        .gt("expires_at", new Date().toISOString())
        .single();

      if (codeError || !linkCode) throw new Error("Código inválido ou expirado");

      const { data: existing } = await supabase
        .from("student_specialists")
        .select("id")
        .eq("student_id", linkCode.student_id)
        .eq("service_type", serviceType)
        .eq("status", "active")
        .maybeSingle();

      if (existing) throw new Error("Aluno já vinculado a um especialista deste serviço");

      const { error: linkError } = await supabase.from("student_specialists").insert({
        student_id: linkCode.student_id,
        specialist_id: user.id,
        service_type: serviceType,
        status: "active",
      });

      if (linkError) throw linkError;

      await supabase.from("student_link_codes").delete().eq("code", code.trim().toUpperCase());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

/** @deprecated renamed to useSpecialistServices */
export const useProfessionalServices = useSpecialistServices;
