import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/Button";

type TotpCodeFormProps = {
  code: string;
  onChangeCode: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  /** Muda a instrução: com QR Code fala em escanear, sem QR fala só em informar o código. */
  hasQrCode: boolean;
  /** O QR Code e a chave manual entram como filhos: pertencem ao mesmo `<form>` para o submit alcançar o botão. */
  children?: ReactNode;
};

/** O formulário de 6 dígitos que confirma a inscrição do autenticador. */
export function TotpCodeForm({
  code,
  onChangeCode,
  onSubmit,
  loading,
  hasQrCode,
  children,
}: TotpCodeFormProps) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {children}
      <p className="text-center text-sm text-muted-foreground">
        {hasQrCode
          ? "Escaneie o QR Code no seu aplicativo autenticador e informe o código gerado."
          : "Informe o código gerado no seu aplicativo autenticador."}
      </p>
      {hasQrCode ? (
        <p className="text-center text-xs text-muted-foreground">
          No aplicativo, toque em adicionar conta e selecione escanear QR Code. Depois, digite aqui
          o código de seis dígitos exibido por ele.
        </p>
      ) : null}
      <label className="block text-sm font-medium text-foreground" htmlFor="totp-code">
        Código do autenticador
      </label>
      <input
        autoComplete="one-time-code"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center tracking-[0.5em] text-foreground"
        id="totp-code"
        inputMode="numeric"
        maxLength={6}
        onChange={(event) => onChangeCode(event.target.value)}
        value={code}
      />
      <Button fullWidth isLoading={loading} type="submit">
        Confirmar código
      </Button>
    </form>
  );
}
