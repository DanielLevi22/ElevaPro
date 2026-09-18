import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "./constants";
import { PASSWORD_REQUIREMENTS_ERROR } from "./messages";

/** Política mínima aplicada antes de criar qualquer conta no Eleva Pro. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_ERROR)
  .regex(/[a-z]/, PASSWORD_REQUIREMENTS_ERROR)
  .regex(/[A-Z]/, PASSWORD_REQUIREMENTS_ERROR)
  .regex(/\d/, PASSWORD_REQUIREMENTS_ERROR)
  .regex(/[^A-Za-z0-9\s]/, PASSWORD_REQUIREMENTS_ERROR);

export const registrationCredentialsSchema = z
  .object({
    fullName: z.string().trim().min(2, "Digite seu nome completo"),
    email: z.string().trim().email("Digite um e-mail válido"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });
