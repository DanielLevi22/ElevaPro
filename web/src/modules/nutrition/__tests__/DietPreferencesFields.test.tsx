import type { DietPlanPreferences } from "@elevapro/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DietPreferencesFields } from "@/modules/nutrition/components/DietPreferencesFields";

const EMPTY: DietPlanPreferences = {
  dietary_restrictions: [],
  meals_per_day: null,
  allows_supplements: null,
  free_meal_days: [],
};

describe("DietPreferencesFields", () => {
  it("marca a restrição como etiqueta", async () => {
    const onChange = vi.fn();
    render(<DietPreferencesFields value={EMPTY} onChange={onChange} hasOtherNotes={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Sem lactose" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, dietary_restrictions: ["lactose_free"] });
  });

  it("desmarca o suplemento clicando de novo, voltando a 'não informado'", async () => {
    const onChange = vi.fn();
    render(
      <DietPreferencesFields
        value={{ ...EMPTY, allows_supplements: false }}
        onChange={onChange}
        hasOtherNotes={false}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Sem suplementos" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, allows_supplements: null });
  });

  it("guarda o dia da refeição livre pelo número, domingo = 0", async () => {
    const onChange = vi.fn();
    render(<DietPreferencesFields value={EMPTY} onChange={onChange} hasOtherNotes={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Domingo" }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, free_meal_days: [0] });
  });

  // A tela avisa que a anamnese diz mais, sem repetir o que ela diz.
  it("avisa que a anamnese tem outras observações, só quando tem", () => {
    const { rerender } = render(
      <DietPreferencesFields value={EMPTY} onChange={vi.fn()} hasOtherNotes={false} />,
    );
    expect(screen.queryByText(/outras observações/)).not.toBeInTheDocument();

    rerender(<DietPreferencesFields value={EMPTY} onChange={vi.fn()} hasOtherNotes />);
    expect(screen.getByText(/outras observações/)).toBeInTheDocument();
  });
});
