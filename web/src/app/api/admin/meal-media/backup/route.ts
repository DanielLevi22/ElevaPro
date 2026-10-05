import { type NextRequest, NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/api-auth";
import { enforceRequestBodyLimit } from "@/lib/request-body-limit";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { exportCatalogMedia, restoreCatalogMedia } from "@/modules/nutrition/services/server";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const backup = await exportCatalogMedia();
    await audit(auth.caller.id, "export", "succeeded");
    return NextResponse.json(backup, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="meal-media-backup.json"',
      },
    });
  } catch {
    await audit(auth.caller.id, "export", "failed");
    return NextResponse.json(
      {
        error: "export_failed",
        message: "Não foi possível conferir e exportar os originais. Tente novamente.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const blocked = await enforceRequestBodyLimit(request, 3_500_000);
  if (blocked) return blocked;
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("backup" in body) ||
      !("destination" in body) ||
      typeof body.destination !== "string"
    )
      return NextResponse.json({ error: "invalid_backup" }, { status: 400 });
    const restored = await restoreCatalogMedia(body.backup, body.destination);
    await audit(auth.caller.id, "restore", "succeeded");
    return NextResponse.json({
      restored: restored.assets.length,
      message: "Arquivos copiados e conferidos. A entrega ativa foi preservada.",
    });
  } catch {
    await audit(auth.caller.id, "restore", "failed");
    return NextResponse.json(
      {
        error: "restore_failed",
        message:
          "Não foi possível restaurar. Confira o backup e o destino; você pode tentar novamente.",
      },
      { status: 400 },
    );
  }
}

function audit(actorId: string, action: "export" | "restore", outcome: "succeeded" | "failed") {
  return recordSecurityAuditEvent({
    actorId,
    eventType: `catalog.media.${action}`,
    outcome,
    resourceType: "meal_media_catalog",
    resourceId: "meal-catalog-v1",
  });
}
