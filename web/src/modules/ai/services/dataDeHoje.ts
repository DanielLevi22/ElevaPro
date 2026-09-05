/**
 * A data de hoje, dita ao modelo.
 *
 * Sem isto ele não tem relógio: "hoje" é uma palavra sem referente, e quando o
 * especialista respondia "hoje" à pergunta da data de início, o assistente
 * perguntava de volta que dia era hoje. O roteiro ainda reforçava o efeito ao
 * proibir, com razão, que ele inventasse a data — as duas coisas tinham virado
 * a mesma proibição.
 *
 * **O fuso é o de quem usa, não o do servidor.** A rota roda na Vercel, em UTC:
 * entre as 21h e a meia-noite no Brasil, o UTC já está no dia seguinte, e a
 * periodização começaria amanhã com o assistente achando que é hoje.
 *
 * @example
 * blocoDaDataDeHoje(new Date("2026-09-05T14:00:00Z"))
 * // "HOJE É 05/09/2026 (sexta-feira)..."
 */
const FUSO = "America/Sao_Paulo";

export function blocoDaDataDeHoje(agora: Date = new Date()): string {
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(agora);

  const diaDaSemana = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
  }).format(agora);

  // `AAAA-MM-DD` junto porque é o formato que as ferramentas exigem, e deixar o
  // modelo converter de `05/09/2026` é uma chance a mais de errar o mês.
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(agora);

  return [
    `HOJE É ${data} (${diaDaSemana}), ou ${iso} no formato das ferramentas.`,
    "",
    'Quando o especialista disser "hoje", "amanhã", "semana que vem" ou "segunda",',
    "resolva a partir desta data e siga em frente — não pergunte que dia é hoje.",
    "A proibição de inventar data continua valendo para quando ninguém disser nada.",
  ].join("\n");
}
