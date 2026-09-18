import type { RegistrationCredentials, ServiceType } from "@elevapro/shared";

export type AccountRole = "specialist" | "student";

export type AccountRegistration = {
  role: AccountRole;
  services: ServiceType[];
  credentials: RegistrationCredentials;
};
