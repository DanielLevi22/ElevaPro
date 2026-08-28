#!/usr/bin/env node
/**
 * check-native-alerts.js
 *
 * Falha quando o mobile volta a usar o `Alert.alert` do React Native.
 *
 * O `Alert` desenha o diálogo do sistema operacional: cinza claro no iOS,
 * Material no Android, tipografia do aparelho. O Eleva Pro é preto com
 * gradiente e fonte própria — o diálogo nativo aparecia no meio da tela como
 * um pedaço de outro aplicativo. Também não dá controle sobre ícone nem sobre
 * a cor da ação destrutiva, então "Excluir" e "Salvo" saíam com o mesmo peso.
 *
 * Havia 111 chamadas espalhadas por 37 arquivos quando esta guarda entrou.
 * Todas viraram `showAlert` / `showConfirm`, que desenham o StatusModal e o
 * ConfirmModal do design system.
 *
 * Uso: npm run app:check-alerts
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "app/src");

const ALERT_NATIVO = /\bAlert\s*\.\s*alert\s*\(/;

function arquivos(dir) {
  const encontrados = [];
  const pilha = [dir];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    if (!fs.existsSync(atual)) continue;
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name !== "node_modules") pilha.push(completo);
      } else if (/\.tsx?$/.test(entrada.name)) {
        encontrados.push(completo);
      }
    }
  }
  return encontrados;
}

function main() {
  const achados = [];

  for (const arquivo of arquivos(DIR)) {
    const linhas = fs.readFileSync(arquivo, "utf8").split("\n");
    for (const [indice, linha] of linhas.entries()) {
      if (/^\s*(\/\/|\*|\/\*)/.test(linha)) continue;
      if (ALERT_NATIVO.test(linha)) {
        const relativo = path.relative(ROOT, arquivo).split(path.sep).join("/");
        achados.push(`${relativo}:${indice + 1}`);
      }
    }
  }

  if (achados.length === 0) {
    console.log("✓ Nenhum Alert nativo no mobile.");
    return;
  }

  console.error(`\n✗ ${achados.length} chamada(s) de Alert.alert:\n`);
  for (const achado of achados) console.error(`   ${achado}`);
  console.error(
    "\n   O diálogo do sistema destoa do app e não deixa escolher ícone nem\n" +
      "   cor de ação destrutiva.\n\n" +
      "   Use a primitiva do design system:\n" +
      "     import { showAlert, showConfirm } from '@/components/ui/appAlert';\n\n" +
      "     showAlert({ title: 'Erro', message: '...', type: 'error' });\n" +
      "     showConfirm({ title: 'Excluir', message: '...', type: 'danger',\n" +
      "                   confirmText: 'Excluir', onConfirm: () => remove(id) });\n",
  );
  process.exit(1);
}

main();
