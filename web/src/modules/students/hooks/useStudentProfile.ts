"use client";

import { supabase } from "@elevapro/supabase";
import { useQuery } from "@tanstack/react-query";

export interface StudentProfile {
  persona_track: string | null;
  coach_mode: string | null;
}

export function useStudentProfile(studentId: string | null) {
  return useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: async (): Promise<StudentProfile | null> => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("persona_track, coach_mode")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data ? { persona_track: data.persona_track, coach_mode: data.coach_mode } : null;
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });
}
