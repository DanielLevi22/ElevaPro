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
        totalImages: 0,
        page: 1,
        pageSize: 10,
        backupImageCount: 16,
        delivery: "external",
        destinations: { imagekit: true },
      }),
    ),
  );
});

it("consulta a próxima página no servidor e mostra fotos hospedadas", async () => {
  const image = {
    id: "photo-cloud-1",
    version: 1,
    path: "meal-images/cloud.jpg",
    url: "https://cdn.example.test/meal-images/cloud.jpg",
    bytes: 1234,
    sha256: "a".repeat(64),
    contentType: "image/jpeg",
  };
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        catalog: {
          version: 1,
          recipes: [{ imageId: image.id, title: "Prato da nuvem" }],
          images: [image],
        },
        totalImages: 11,
        page: 1,
        pageSize: 10,
        backupImageCount: 16,
        delivery: "external",
        destinations: { imagekit: true },
      }),
    ),
  );
  render(<MealMediaAdminPage />);
  await screen.findByText("Prato da nuvem");
  expect(screen.getByRole("img")).toHaveAttribute("src", image.url);
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  const nextImage = { ...image, id: "photo-cloud-11" };
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        catalog: {
          version: 1,
          recipes: [{ imageId: nextImage.id, title: "Último prato" }],
          images: [nextImage],
        },
        totalImages: 11,
        page: 2,
        pageSize: 10,
        backupImageCount: 16,
        delivery: "external",
        destinations: { imagekit: true },
      }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByText("Último prato");
  expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/meal-media?page=2");
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  expect(screen.queryByText("Prato da nuvem")).not.toBeInTheDocument();
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
