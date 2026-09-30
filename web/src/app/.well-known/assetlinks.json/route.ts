import type { NextRequest } from "next/server";

/** Publica a associação Android apenas no host e certificado configurados. */
export function GET(request: NextRequest): Response {
  const rpId = process.env.PASSKEY_RP_ID;
  const fingerprint = process.env.PASSKEY_ANDROID_SHA256_FINGERPRINT;
  if (
    !rpId ||
    request.nextUrl.hostname !== rpId ||
    !fingerprint ||
    !/^[A-F0-9]{2}(:[A-F0-9]{2}){31}$/i.test(fingerprint)
  ) {
    return new Response(null, { status: 404 });
  }

  return Response.json([
    {
      relation: ["delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: "com.elevapro.app",
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ]);
}
