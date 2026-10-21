"use client";

import { type SetPrescription, TRAINING_METHODS } from "@elevapro/shared";
import { ExtraMethods } from "./ExtraMethods";
import { MethodInfo } from "./MethodInfo";
import { NumberField } from "./NumberField";
import { SegmentList } from "./SegmentList";
import { extraMethodsOf, primaryTypeOf, toggleMethod } from "./setPlanEditing";

const BY_ID = new Map(TRAINING_METHODS.map((m) => [m.id, m]));

interface SetDetailsProps {
  set: SetPrescription;
  onChange: (set: SetPrescription) => void;
}

/**
 * O que a linha da série não mostra: técnicas extras, blocos, RIR alvo e como
 * fazer cada técnica, com o artigo.
 *
 * @example <SetDetails set={set} onChange={onChange} />
 */
export function SetDetails({ set, onChange }: SetDetailsProps) {
  const type = primaryTypeOf(set);
  const extras = extraMethodsOf(set);
  const explained = [type === "working" ? null : type, ...extras].flatMap(
    (id) => (id ? BY_ID.get(id) : undefined) ?? [],
  );

  return (
    <div className="grid gap-4 border-t border-overlay-10 bg-background/30 px-3 py-3 md:grid-cols-[1fr_15rem]">
      <div className="space-y-4">
        <section className="space-y-1.5">
          <h4 className="text-[11px] font-semibold text-foreground">Técnicas extras</h4>
          <ExtraMethods selected={extras} onToggle={(id) => onChange(toggleMethod(set, id))} />
        </section>
        <section className="space-y-1.5">
          <h4 className="text-[11px] font-semibold text-foreground">Blocos de repetição</h4>
          <SegmentList set={set} onChange={onChange} />
        </section>
        <NumberField
          label="RIR alvo (0 a 5)"
          value={set.target_rir}
          min={0}
          max={5}
          placeholder="—"
          onChange={(target_rir) =>
            onChange({
              ...set,
              target_rir:
                target_rir === null ? null : Math.min(5, Math.max(0, Math.round(target_rir))),
            })
          }
        />
      </div>
      <aside className="space-y-1.5">
        <h4 className="text-[11px] font-semibold text-foreground">Como fazer</h4>
        {explained.length > 0 ? (
          <MethodInfo methods={explained} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Série Normal. Escolha um tipo ou marque uma técnica para ver como ela funciona e o que a
            pesquisa diz.
          </p>
        )}
      </aside>
    </div>
  );
}
