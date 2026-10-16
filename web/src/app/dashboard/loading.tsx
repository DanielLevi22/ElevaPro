import { Skeleton } from "@/shared/components/ui/Skeleton";

/**
 * Mantém a espera da rota dentro do conteúdo; o layout continua navegável.
 * @example <Suspense fallback={<DashboardLoading />}>...</Suspense>
 */
export default function DashboardLoading() {
  return (
    <section role="status" aria-label="Carregando página" className="space-y-8">
      <span className="sr-only">Carregando página...</span>
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 bg-muted motion-reduce:animate-none" />
          <Skeleton className="h-4 w-64 max-w-full bg-muted motion-reduce:animate-none" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <Skeleton key={card} className="h-28 rounded-2xl bg-muted motion-reduce:animate-none" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
    </section>
  );
}
