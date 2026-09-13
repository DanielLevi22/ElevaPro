export type AccountType = "admin" | "specialist" | "student" | "member";

export type AccountStatus = "active" | "inactive" | "invited";

export type ServiceType = "personal_training" | "nutrition_consulting";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: AccountType;
  account_status: AccountStatus;
  created_at: string;
}

/**
 * O perfil como a tela o mostra: nome e avatar.
 *
 * Existe para quem só desenha a identidade não trazer email, papel e status
 * para o aparelho — é o que o `Profile` inteiro carrega.
 */
export type ProfileSummary = Pick<Profile, "id" | "full_name" | "avatar_url">;

export interface SpecialistService {
  id: string;
  specialist_id: string;
  service_type: ServiceType;
  created_at: string;
}

export interface ProfileWithServices extends Profile {
  specialist_services: SpecialistService[];
}
