"use client";

import type { MealImage } from "@elevapro/shared";
import { Download, Images, RefreshCw, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/shared/components/ui/DataTable";
import { useMealMediaAdmin } from "../hooks/useMealMediaAdmin";

/** Biblioteca portável das fotos ilustrativas, restrita pelo servidor. @example <MealMediaAdminPage /> */
export function MealMediaAdminPage() {
  const media = useMealMediaAdmin();
  const [backup, setBackup] = useState<File | null>(null);
  const images = media.overview?.catalog.images ?? [];
  const recipes = media.overview?.catalog.recipes ?? [];
  const available = media.overview?.destinations.imagekit ?? false;
  const columns: DataTableColumn<MealImage>[] = [
    {
      key: "photo",
      header: "Imagem",
      width: "md:w-24",
      keepOnMobile: true,
      render: (image) => (
        <Image
          src={image.url}
          alt="Foto ilustrativa do prato"
          width={72}
          height={56}
          unoptimized
          className="rounded-lg object-cover"
        />
      ),
    },
    {
      key: "recipe",
      header: "Prato",
      keepOnMobile: true,
      render: (image) => (
        <div>
          <p className="font-semibold">
            {recipes.find((recipe) => recipe.imageId === image.id)?.title ?? image.id}
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{image.id}</p>
        </div>
      ),
    },
    { key: "version", header: "Versão", width: "md:w-20", render: (image) => `v${image.version}` },
    {
      key: "size",
      header: "Tamanho",
      width: "md:w-24",
      render: (image) => `${Math.round(image.bytes / 1000)} KB`,
    },
    {
      key: "integrity",
      header: "Integridade",
      width: "md:w-40",
      render: (image) => (
        <span title={image.sha256} className="font-mono text-xs">
          {image.sha256.slice(0, 12)}…
        </span>
      ),
    },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Images className="text-primary-text" aria-hidden />
            <h1 className="text-2xl font-bold">Imagens do cardápio</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerencie os originais e leve suas imagens para outro provedor.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={media.loading || media.busy}
          onClick={() => void media.refresh()}
        >
          <RefreshCw size={16} aria-hidden />
          Atualizar
        </Button>
      </header>
      {media.error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground"
        >
          {media.error}
        </div>
      ) : null}
      {media.notice ? (
        <p role="status" className="rounded-xl bg-primary/10 p-4 text-sm">
          {media.notice}
        </p>
      ) : null}
      {media.busy ? (
        <p role="status" className="text-sm text-muted-foreground">
          Conferindo e processando as imagens…
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Imagens" value={String(images.length)} />
        <Summary
          label="Volume dos originais"
          value={`${(images.reduce((total, image) => total + image.bytes, 0) / 1_000_000).toFixed(2)} MB`}
        />
        <Summary
          label="Entrega atual"
          value={media.overview?.delivery === "external" ? "Provedor externo" : "Não configurado"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-bold">Exportar originais</h2>
          <p className="text-sm text-muted-foreground">
            O backup reúne as fotos e suas versões. A integridade de cada arquivo é conferida antes
            do download.
          </p>
          <Button
            disabled={media.busy || media.loading || !images.length}
            isLoading={media.busy}
            onClick={() => void media.download()}
          >
            <Download size={16} aria-hidden />
            Exportar backup
          </Button>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-bold">Restaurar em outro destino</h2>
          <p className="text-sm text-muted-foreground">
            Copie os arquivos preservando os IDs. A origem e a entrega atual são mantidas durante a
            conferência.
          </p>
          <label className="block text-sm font-medium" htmlFor="media-backup">
            Backup de imagens (.json)
          </label>
          <input
            id="media-backup"
            type="file"
            accept="application/json,.json"
            disabled={media.busy}
            onChange={(event) => setBackup(event.target.files?.[0] ?? null)}
            className="block w-full rounded-lg border border-border p-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Até 3 MB por backup nesta versão.</p>
          <p className="text-sm font-medium">Destino da cópia: ImageKit</p>
          {!media.overview?.destinations.imagekit ? (
            <p className="text-xs text-muted-foreground">
              ImageKit ainda não configurado no servidor.
            </p>
          ) : null}
          <Button
            variant="secondary"
            disabled={!backup || !available || media.busy}
            onClick={() => {
              if (backup) void media.restore(backup, "imagekit");
            }}
          >
            <Upload size={16} aria-hidden />
            Restaurar backup
          </Button>
        </section>
      </div>
      <section className="space-y-3">
        <h2 className="font-bold">Biblioteca de pratos</h2>
        <DataTable
          columns={columns}
          rows={images}
          rowKey={(image) => image.id}
          isLoading={media.loading}
          emptyState={
            <p className="p-6 text-sm text-muted-foreground">Nenhuma imagem disponível.</p>
          }
        />
      </section>
      <p className="text-xs text-muted-foreground">
        Fotos ilustrativas do catálogo experimental. A troca da entrega deve ocorrer após conferir a
        cópia e manter a origem durante a transição.
      </p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
