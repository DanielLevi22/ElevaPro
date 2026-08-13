import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // `shared/` está fora da raiz do Vite; sem liberar o pai, o arquivo é
  // encontrado pelo glob mas recusado no carregamento.
  server: { fs: { allow: [".."] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // `shared/` não tem runner próprio, e sem esta linha os testes de lá
    // simplesmente não rodam — passariam por "verdes" sem nunca executar.
    include: ["src/**/*.{test,spec}.{ts,tsx}", "../shared/src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts", "src/app/**/page.tsx", "src/app/**/layout.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@elevapro/core": resolve(__dirname, "./src/packages/core"),
      "@elevapro/supabase": resolve(__dirname, "./src/packages/supabase"),
      "@elevapro/shared": resolve(__dirname, "../shared/src"),
    },
  },
});
