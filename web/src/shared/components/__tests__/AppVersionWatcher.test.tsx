import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { AppVersionWatcher } from "../AppVersionWatcher";

const reload = vi.fn();
const fetchVersion = vi.fn();

function liveVersion(version: string) {
  fetchVersion.mockResolvedValue({ ok: true, json: async () => ({ version }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.stubGlobal("fetch", fetchVersion);
  liveVersion("bbbbbbb");
});

// #428: depois do deploy, a aba nova seguia na versão antiga até o Ctrl+R.
describe("AppVersionWatcher", () => {
  it("recarrega a aba que abriu com a versão anterior", async () => {
    render(<AppVersionWatcher builtVersion="aaaaaaa" reload={reload} />);

    await waitFor(() =>
      expect(reload, "VERSÃO ANTIGA: aba nova não recarregou").toHaveBeenCalledOnce(),
    );
  });

  it("não recarrega quando a versão no ar é a carregada", async () => {
    liveVersion("aaaaaaa");
    render(<AppVersionWatcher builtVersion="aaaaaaa" reload={reload} />);

    await waitFor(() => expect(fetchVersion).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();
  });

  it("avisa em vez de recarregar de novo se a versão seguir diferente", async () => {
    sessionStorage.setItem("app-version-reloaded-to", "bbbbbbb");
    render(<AppVersionWatcher builtVersion="aaaaaaa" reload={reload} />);

    await waitFor(() => expect(toast).toHaveBeenCalledOnce());
    expect(reload, "LAÇO: recarregou de novo para a mesma versão").not.toHaveBeenCalled();
  });

  it("só avisa quando o deploy muda com a aba em uso", async () => {
    liveVersion("aaaaaaa");
    render(<AppVersionWatcher builtVersion="aaaaaaa" reload={reload} />);
    await waitFor(() => expect(fetchVersion).toHaveBeenCalledOnce());

    liveVersion("bbbbbbb");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));

    await waitFor(() => expect(toast).toHaveBeenCalledOnce());
    expect(reload, "DIGITAÇÃO PERDIDA: aba em uso recarregou sozinha").not.toHaveBeenCalled();
  });

  it("não consulta a versão no next dev", () => {
    render(<AppVersionWatcher builtVersion="dev" reload={reload} />);

    expect(fetchVersion).not.toHaveBeenCalled();
  });
});
