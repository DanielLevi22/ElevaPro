type ManualKeyDisclosureProps = {
  secret: string;
};

/** A chave manual para quem não consegue escanear o QR Code. Some ao trocar de página — nunca é persistida. */
export function ManualKeyDisclosure({ secret }: ManualKeyDisclosureProps) {
  return (
    <details className="rounded-lg border border-white/10 bg-white/5 p-3 text-left">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Não conseguiu escanear? Inserir chave manualmente
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        No aplicativo autenticador, escolha inserir uma chave e copie a sequência abaixo. Não a
        compartilhe com ninguém.
      </p>
      <code className="mt-2 block break-all rounded bg-black/20 p-2 text-xs text-foreground select-all">
        {secret}
      </code>
    </details>
  );
}
