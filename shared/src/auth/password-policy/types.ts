import type { z } from "zod";
import type { registrationCredentialsSchema } from "./schema";

export type RegistrationCredentials = z.infer<typeof registrationCredentialsSchema>;
