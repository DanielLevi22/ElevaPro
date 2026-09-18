import { z } from "zod";

const registrationFieldsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  full_name: z.string().trim().min(1),
});

const serviceTypeSchema = z.enum(["personal_training", "nutrition_consulting"]);

export const memberRegistrationRequestSchema = registrationFieldsSchema;

export const specialistRegistrationRequestSchema = registrationFieldsSchema.extend({
  service_types: z.array(serviceTypeSchema).min(1),
});

export type MemberRegistrationRequest = z.infer<typeof memberRegistrationRequestSchema>;
export type SpecialistRegistrationRequest = z.infer<typeof specialistRegistrationRequestSchema>;
