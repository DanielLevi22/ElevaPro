import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_AI_BODY_LIMIT_BYTES = 1_000_000;
const IMAGE_AI_BODY_LIMIT_BYTES = 8_000_000;

export const aiBodyLimits = {
  default: DEFAULT_AI_BODY_LIMIT_BYTES,
  image: IMAGE_AI_BODY_LIMIT_BYTES,
} as const;

function declaredBodySize(request: Request): number | null {
  const value = request.headers.get("content-length");
  if (!value) return null;

  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

/**
 * Recusa payloads excessivos sem expor nem registrar o seu conteúdo.
 *
 * @example
 * const blocked = await enforceRequestBodyLimit(request, aiBodyLimits.default);
 * if (blocked) return blocked;
 */
export async function enforceRequestBodyLimit(
  request: NextRequest,
  maximumBytes: number,
): Promise<NextResponse | null> {
  const declaredSize = declaredBodySize(request);
  if (declaredSize !== null && declaredSize > maximumBytes) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const body = await request.clone().arrayBuffer();
  if (body.byteLength > maximumBytes) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  return null;
}
