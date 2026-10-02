#!/usr/bin/env node
/**
 * Remove os autenticadores (fatores TOTP) das contas do Supabase **local**.
 *
 * No local o app confirma o segundo fator sozinho (#355), mas só consegue com o
 * segredo que ele mesmo cadastrou. Conta cujo autenticador foi cadastrado num
 * celular precisa perder esse fator uma vez; no login seguinte o app cadastra
 * um novo e passa a confirmá-lo sem a tela.
 *
 * Usa a chave `service_role`, que apaga o segundo fator de qualquer conta. Por
 * isso recusa toda API que não seja a da própria máquina — inclusive quando o
 * CLI está vinculado a um projeto hospedado.
 *
 * Uso: npm run local:reset-mfa   (com o Supabase local de pé)
 */

import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

/**
 * Lança se a URL não for a API do Supabase da máquina.
 * @example assertLocalApi("http://127.0.0.1:47321")
 */
export function assertLocalApi(apiUrl) {
  let host = "";
  try {
    host = new URL(apiUrl).hostname;
  } catch {
    // URL inválida cai na recusa abaixo, com o valor na mensagem.
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `A limpeza só roda contra o Supabase local; recebeu API "${apiUrl}". ` +
        "Esperado http://127.0.0.1:<porta> ou http://localhost:<porta>.",
    );
  }
}

/**
 * Apaga os fatores TOTP de todas as contas e devolve quantos saíram.
 * @example await resetTotpFactors(adminApi(url, key)) // 2
 */
export async function resetTotpFactors(api) {
  let count = 0;
  for (const user of await api.listUsers()) {
    for (const factor of user.factors ?? []) {
      if (factor.factor_type !== "totp") continue;
      await api.deleteFactor(user.id, factor.id);
      count++;
    }
  }
  return count;
}

function adminApi(apiUrl, serviceKey) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const call = async (path, method = "GET") => {
    const response = await fetch(`${apiUrl}/auth/v1/admin${path}`, { method, headers });
    if (!response.ok) throw new Error(`Admin API ${method} ${path} respondeu ${response.status}`);
    return method === "GET" ? response.json() : null;
  };
  return {
    listUsers: async () => (await call("/users?per_page=1000")).users,
    deleteFactor: (userId, factorId) => call(`/users/${userId}/factors/${factorId}`, "DELETE"),
  };
}

function localStatus() {
  const output = execSync("npx supabase status -o env", { encoding: "utf8" });
  const value = (key) => output.match(new RegExp(`^${key}="?([^"\\n]*)"?$`, "m"))?.[1] ?? "";
  return { apiUrl: value("API_URL"), serviceKey: value("SERVICE_ROLE_KEY") };
}

async function main() {
  const { apiUrl, serviceKey } = localStatus();
  assertLocalApi(apiUrl);
  const count = await resetTotpFactors(adminApi(apiUrl, serviceKey));
  console.log(`✓ ${count} autenticador(es) removido(s) do Supabase local.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`❌  ${error.message}`);
    process.exit(1);
  });
}
