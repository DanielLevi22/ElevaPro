import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MealMediaAdminPage } from "../../pages/MealMediaAdminPage";

vi.mock("@elevapro/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "admin-token" } }, error: null }),
    },
  },
}));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        catalog: { version: 1, recipes: [], images: [] },
        delivery: "external",
        destinations: { imagekit: true },
      }),
    ),
  );
});

it("admin pode repetir restauração após falha, mantendo o arquivo selecionado", async () => {
  render(<MealMediaAdminPage />);
  await screen.findByText("Provedor externo");
  const file = new File(['{"manifest":{"version":1,"assets":[]},"files":{}}'], "backup.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: async () => '{"manifest":{"version":1,"assets":[]},"files":{}}',
  });
  fireEvent.change(screen.getByLabelText("Backup de imagens (.json)"), {
    target: { files: [file] },
  });
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Falha no destino. Tente novamente." }), {
      status: 503,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Restaurar backup" }));
  await screen.findByRole("alert");
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ restored: 16, message: "16 imagens conferidas." })),
  );
  fireEvent.click(screen.getByRole("button", { name: "Restaurar backup" }));
  await screen.findByText("16 imagens conferidas.");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
});
