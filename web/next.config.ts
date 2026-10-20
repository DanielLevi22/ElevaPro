import "dotenv/config";
import type { NextConfig } from "next";
import { appVersionFrom } from "./src/lib/app-version";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const supabaseSocketOrigin = supabaseOrigin.replace(/^https:/, "wss:");
const developmentScript = process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'";
const developmentSocket = process.env.NODE_ENV === "production" ? "" : "ws:";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net ${developmentScript}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseSocketOrigin} https://cdn.jsdelivr.net https://storage.googleapis.com ${developmentSocket}`,
  `img-src 'self' data: blob: https://avatar.vercel.sh ${supabaseOrigin}`,
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // O cliente compara esta versão com `/api/version` para sair do deploy
  // anterior sem Ctrl+R (#428).
  env: { NEXT_PUBLIC_APP_VERSION: appVersionFrom(process.env.VERCEL_GIT_COMMIT_SHA) },
  // O `paths` do tsconfig aponta `@casl/ability` para o `.d.ts`, que é só tipo.
  // Sem este desvio o Turbopack empacota esse arquivo, o `AbilityBuilder` chega
  // `undefined` no browser e todo login cai em `auth.profile_load_failed`.
  turbopack: {
    resolveAlias: { "@casl/ability": "./node_modules/@casl/ability" },
  },
  // Import de barril custa 200-800ms de cold start porque carrega a biblioteca
  // inteira. Isto reescreve `import { X } from "lucide-react"` para o import
  // direto no build, sem obrigar cada arquivo a conhecer o caminho interno.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts", "framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
