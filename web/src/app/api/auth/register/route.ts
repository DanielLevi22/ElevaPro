import { passwordValidationError } from "@elevapro/shared";
import { NextResponse } from "next/server";
import {
  guardPublicRegistration,
  readPublicRegistrationJson,
} from "@/lib/public-registration-guard";
import { attachTraceId } from "@/lib/trace";
import {
  provisionSpecialistRegistration,
  specialistRegistrationRequestSchema,
} from "@/modules/auth/services";

export async function POST(request: Request) {
  const guard = await guardPublicRegistration(request);
  if (guard.response) return guard.response;
  const { traceId } = guard;

  const parsed = await readPublicRegistrationJson(request, traceId);
  if (parsed.response) return parsed.response;

  const registration = specialistRegistrationRequestSchema.safeParse(parsed.body);
  if (!registration.success) {
    return attachTraceId(
      NextResponse.json({ error: "Dados de cadastro inválidos." }, { status: 400 }),
      traceId,
    );
  }
  const { password } = registration.data;

  const passwordError = passwordValidationError(password);
  if (passwordError) {
    return attachTraceId(NextResponse.json({ error: passwordError }, { status: 400 }), traceId);
  }

  const result = await provisionSpecialistRegistration(registration.data, traceId);
  return attachTraceId(
    NextResponse.json(result.ok ? { success: true } : { error: result.error }, {
      status: result.ok ? 200 : result.status,
    }),
    traceId,
  );
}
