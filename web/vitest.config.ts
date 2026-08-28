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
      // Degraus, não a meta. O número que entra é o que já se sustenta hoje —
      // threshold que falha no dia em que entra não é guarda, é bloqueio. Sobe
      // junto com cada PR que traz teste (alvo do PRD: web 45%).
      //
      // Só `web/src` entra na conta. Os testes de `shared/` rodam nesta suíte
      // (ver `include` acima), mas o provider v8 descarta da medição arquivo
      // fora da raiz do Vite: um threshold apontado para `../shared/**` casaria
      // com zero arquivo e passaria sempre — guarda que parece existir e não
      // existe. Medir `shared/` exige runner próprio para ele; está anotado nas
      // pendências do PRD.
      thresholds: {
        statements: 19,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@elevapro/supabase": resolve(__dirname, "./src/packages/supabase"),
      "@elevapro/shared": resolve(__dirname, "../shared/src"),
      // `shared/` não tem node_modules próprio: sem este alias o import de
      // runtime que `abilities.ts` faz não resolve na hora do teste.
      "@casl/ability": resolve(__dirname, "./node_modules/@casl/ability"),
    },
  },
});
