import "dotenv/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
};

export default nextConfig;
