import type { Config } from "drizzle-kit";

/**
 * Configuração do drizzle-kit para todo o monorepo.
 *
 * Vive na raiz porque nada aqui pertence ao mobile: o schema é de `shared/`
 * e a saída é `supabase/migrations`. Antes ficava em `app/`, o que sugeria
 * que migrations eram assunto do app.
 *
 * Uso:
 *   npm run db:generate   → gera SQL a partir do schema Drizzle
 *   npm run db:check      → detecta conflito entre migrations
 *
 * Quem APLICA é o supabase CLI (`supabase db push`), no pipeline —
 * nunca `drizzle-kit push`, que ignora o versionamento de migrations.
 */
export default {
  schema: "./shared/src/database/schema/index.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Só usado por comandos que tocam o banco (introspect/push). O `generate`
    // não precisa de conexão. Antes apontava para EXPO_PUBLIC_DATABASE_URL,
    // que nunca foi definida em nenhum .env — qualquer comando conectado falhava.
    url: process.env.DATABASE_URL as string,
  },
} satisfies Config;
