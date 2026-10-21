import type { TrainingMethod } from "@elevapro/shared";
import { MethodBadge } from "@/shared/components/ui/MethodBadge";

/**
 * O que cada técnica da série faz e o artigo que a sustenta, quando há.
 *
 * @example <MethodInfo methods={[restPause, isometria]} />
 */
export function MethodInfo({ methods }: { methods: TrainingMethod[] }) {
  return (
    <div className="space-y-3 rounded-lg border border-overlay-10 bg-background/40 p-3">
      {methods.map((m) => (
        <div key={m.id} className="space-y-1">
          <MethodBadge method={m.id} />
          <p className="text-xs leading-relaxed text-muted-foreground">{m.explanation}</p>
          {m.reference ? (
            <a
              href={m.reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-primary-text underline-offset-2 hover:underline"
            >
              {m.reference.label} ↗
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
