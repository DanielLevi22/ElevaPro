import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { GET as appleAssociation } from "./apple-app-site-association/route";
import { GET as androidAssociation } from "./assetlinks.json/route";

const previewUrl = new NextRequest(
  "https://elevapro-preview.vercel.app/.well-known/assetlinks.json",
);
const fingerprint = Array.from({ length: 32 }, () => "FC").join(":");

describe("associação de Passkeys nativas", () => {
  afterEach(() => {
    delete process.env.PASSKEY_RP_ID;
    delete process.env.PASSKEY_ANDROID_SHA256_FINGERPRINT;
    delete process.env.PASSKEY_APPLE_TEAM_ID;
  });

  it("não publica associação sem o certificado real configurado", () => {
    process.env.PASSKEY_RP_ID = "elevapro-preview.vercel.app";
    expect(androidAssociation(previewUrl).status).toBe(404);
    expect(appleAssociation(previewUrl).status).toBe(404);
  });

  it("não associa um build de preview ao host de produção", () => {
    process.env.PASSKEY_RP_ID = "elevapro-preview.vercel.app";
    process.env.PASSKEY_ANDROID_SHA256_FINGERPRINT = fingerprint;
    const productionUrl = new NextRequest(
      "https://elevapro.vercel.app/.well-known/assetlinks.json",
    );
    expect(androidAssociation(productionUrl).status).toBe(404);
  });

  it("publica a associação Android no host configurado", async () => {
    process.env.PASSKEY_RP_ID = "elevapro-preview.vercel.app";
    process.env.PASSKEY_ANDROID_SHA256_FINGERPRINT = fingerprint;
    const response = androidAssociation(previewUrl);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([
      { target: { package_name: "com.elevapro.app", sha256_cert_fingerprints: [fingerprint] } },
    ]);
  });
});
