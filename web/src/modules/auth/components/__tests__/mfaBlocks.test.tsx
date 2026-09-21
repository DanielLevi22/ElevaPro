import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManualKeyDisclosure } from "../ManualKeyDisclosure";
import { QrCodeBlock } from "../QrCodeBlock";
import { TotpCodeForm } from "../TotpCodeForm";

/**
 * Os blocos de apresentação da inscrição TOTP, isolados do controller. O
 * comportamento de carregamento/erro/retry/confirmação já está coberto em
 * `useTotpEnrollment.test.ts` — aqui só a renderização e o repasse de props.
 */
describe("QrCodeBlock", () => {
  it("renderiza a imagem do QR Code recebido", () => {
    render(<QrCodeBlock qrCode="data:image/svg+xml,qr-de-teste" />);

    expect(screen.getByAltText("QR Code para configurar o autenticador")).toHaveAttribute(
      "src",
      "data:image/svg+xml,qr-de-teste",
    );
  });
});

describe("ManualKeyDisclosure", () => {
  it("mostra a chave manual recebida", () => {
    render(<ManualKeyDisclosure secret="CHAVE-SECRETA" />);

    expect(screen.getByText("CHAVE-SECRETA")).toBeInTheDocument();
  });
});

describe("TotpCodeForm", () => {
  function montar(overrides: Partial<React.ComponentProps<typeof TotpCodeForm>> = {}) {
    const onChangeCode = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <TotpCodeForm
        code=""
        hasQrCode={true}
        loading={false}
        onChangeCode={onChangeCode}
        onSubmit={onSubmit}
        {...overrides}
      />,
    );
    return { onChangeCode, onSubmit };
  }

  it("fala em escanear quando há QR Code", () => {
    montar({ hasQrCode: true });
    expect(screen.getByText(/escaneie o qr code/i)).toBeInTheDocument();
  });

  it("fala só em informar o código quando não há QR Code", () => {
    montar({ hasQrCode: false });
    expect(screen.getByText(/informe o código gerado/i)).toBeInTheDocument();
    expect(screen.queryByText(/escaneie o qr code/i)).not.toBeInTheDocument();
  });

  it("repassa o texto digitado, já sem caracteres não numéricos filtrados por quem chama", () => {
    const { onChangeCode } = montar();
    fireEvent.change(screen.getByLabelText("Código do autenticador"), {
      target: { value: "123456" },
    });
    expect(onChangeCode).toHaveBeenCalledWith("123456");
  });

  it("chama onSubmit ao confirmar", () => {
    const { onSubmit } = montar();
    fireEvent.click(screen.getByRole("button", { name: /confirmar código/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("renderiza os blocos de QR/chave manual passados como filhos", () => {
    montar({
      children: <QrCodeBlock qrCode="data:image/svg+xml,qr-de-teste" />,
    });
    expect(screen.getByAltText("QR Code para configurar o autenticador")).toBeInTheDocument();
  });
});
