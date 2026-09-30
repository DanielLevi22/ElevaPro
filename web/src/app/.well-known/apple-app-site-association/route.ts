import type { NextRequest } from "next/server";

/** Publica a associação iOS somente após existir um Apple Team ID real. */
export function GET(request: NextRequest): Response {
  const rpId = process.env.PASSKEY_RP_ID;
  const teamId = process.env.PASSKEY_APPLE_TEAM_ID;
  if (!rpId || request.nextUrl.hostname !== rpId || !teamId || !/^[A-Z0-9]{10}$/.test(teamId)) {
    return new Response(null, { status: 404 });
  }

  return Response.json({
    applinks: {},
    webcredentials: { apps: [`${teamId}.com.elevapro.app`] },
    appclips: {},
  });
}
