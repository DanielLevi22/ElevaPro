import type { ServiceType } from "./auth.types";

export type LinkStatus = "active" | "inactive";

export interface Student {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  account_status: "active" | "inactive" | "invited";
  service_type: ServiceType;
  link_status: LinkStatus;
  link_created_at: string;
}

// `PhysicalAssessment` vivia aqui com nomes que o banco nunca teve
// (`weight`, `neck`, `photo_front`...). Era a origem da divergência: o tipo
// descrevia uma tabela imaginária e por isso nada acusava os nomes errados.
// Agora mora em `physicalAssessment.types.ts`, derivado do schema real.

export interface FetchStudentsParams {
  page?: number;
  limit?: number;
  sortBy?: "full_name" | "created_at";
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface FetchStudentsResult {
  students: Student[];
  total: number;
}

export interface LinkStudentResult {
  success: boolean;
  error?: string;
}

export interface CreateStudentData {
  specialist_id: string;
  full_name: string;
  email: string;
  password: string;
  service_type: ServiceType;
}
