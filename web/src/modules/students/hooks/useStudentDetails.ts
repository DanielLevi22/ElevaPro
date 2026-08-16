"use client";

import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

export interface StudentProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  account_status: "active" | "inactive" | "invited";
}

export interface StudentMeasurements {
  neck: number | null;
  shoulder: number | null;
  chest: number | null;
  waist: number | null;
  abdomen: number | null;
  hips: number | null;
  arm_right_relaxed: number | null;
  arm_left_relaxed: number | null;
  arm_right_contracted: number | null;
  arm_left_contracted: number | null;
  forearm_right: number | null;
  forearm_left: number | null;
  thigh_proximal_right: number | null;
  thigh_proximal_left: number | null;
  thigh_medial_right: number | null;
  thigh_medial_left: number | null;
  calf_right: number | null;
  calf_left: number | null;
  weight: number | null;
  height: number | null;
  notes: string | null;
}

export interface StudentDetails {
  profile: StudentProfile;
  measurements: StudentMeasurements | null;
}

export function useStudentDetails(studentId: string | null) {
  return useQuery({
    queryKey: ["student-details", studentId],
    queryFn: async (): Promise<StudentDetails> => {
      if (!studentId) throw new Error("studentId is required");

      const [profileResult, assessmentResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, account_status")
          .eq("id", studentId)
          .single(),
        supabase
          .from("physical_assessments")
          // Nomes reais do schema. A lista anterior pedia 21 colunas que não
          // existem, e o PostgREST recusava a consulta inteira com 42703.
          .select("*")
          .eq("student_id", studentId)
          .order("assessed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;

      return {
        profile: profileResult.data as StudentProfile,
        measurements: (assessmentResult.data as StudentMeasurements | null) ?? null,
      };
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });
}
