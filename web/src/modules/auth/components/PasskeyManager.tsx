"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isPasskeyEnabled,
  listPasskeys,
  type RegisteredPasskey,
  registerPasskey,
  removePasskey,
  renamePasskey,
} from "@/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { formatDate } from "@/shared/utils/formatDate";

/** Permite que a conta autenticada administre os próprios aparelhos. */
export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<RegisteredPasskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setPasskeys(await listPasskeys());
  }, []);

  useEffect(() => {
    if (!isPasskeyEnabled()) return;
    void refresh()
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Não foi possível listar os aparelhos."),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await operation();
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o aparelho.");
    } finally {
      setBusy(false);
    }
  };

  if (!isPasskeyEnabled())
    return <p>O cadastro de aparelhos ainda não está disponível neste ambiente.</p>;
  if (loading) return <p>Carregando aparelhos...</p>;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Aparelhos de acesso</h1>
        <p className="text-muted-foreground">
          Entre com Face ID, biometria ou PIN. Cadastre um segundo aparelho antes de remover o
          atual.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      <Button isLoading={busy} onClick={() => void run(registerPasskey)}>
        Cadastrar outro aparelho
      </Button>
      <ul className="space-y-3">
        {passkeys.map((passkey) => (
          <PasskeyRow
            key={passkey.id}
            passkey={passkey}
            busy={busy}
            canRemove={passkeys.length > 1}
            onRename={(name) => run(() => renamePasskey(passkey.id, name))}
            onRemove={() => run(() => removePasskey(passkey.id))}
          />
        ))}
      </ul>
    </section>
  );
}

interface PasskeyRowProps {
  passkey: RegisteredPasskey;
  busy: boolean;
  canRemove: boolean;
  onRename: (name: string) => Promise<void>;
  onRemove: () => Promise<void>;
}

function PasskeyRow({ passkey, busy, canRemove, onRename, onRemove }: PasskeyRowProps) {
  const [name, setName] = useState(passkey.friendly_name ?? "");
  return (
    <li className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <label className="block text-sm text-foreground" htmlFor={`passkey-${passkey.id}`}>
        Nome do aparelho
      </label>
      <input
        id={`passkey-${passkey.id}`}
        className="w-full rounded-lg border border-border bg-background p-2 text-foreground"
        maxLength={120}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <p className="text-sm text-muted-foreground">
        Cadastrado em {formatDate(passkey.created_at, "medium")}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || !name.trim()} onClick={() => void onRename(name)}>
          Salvar nome
        </Button>
        <Button
          variant="destructive"
          disabled={busy || !canRemove}
          onClick={() => {
            if (window.confirm("Remover este aparelho do acesso à conta?")) void onRemove();
          }}
        >
          Remover aparelho
        </Button>
      </div>
    </li>
  );
}
