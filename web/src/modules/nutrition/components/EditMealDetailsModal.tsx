"use client";

import {
  DIFICULDADES_DO_PREPARO,
  type DietMeal,
  type DificuldadeDoPreparo,
  textoDaDificuldade,
} from "@elevapro/shared";
import { useState } from "react";
import { CustomTimePicker } from "@/shared/components/CustomTimePicker";
import { Button } from "@/shared/components/ui/Button";
import { Dialog } from "@/shared/components/ui/Dialog";
import { FILTER_SELECT_CLASS } from "@/shared/components/ui/FilterBar";
import { FormField } from "@/shared/components/ui/FormField";
import { Input } from "@/shared/components/ui/Input";

/** O que o modal grava na refeição: o horário e o preparo que o aluno vê. */
export interface DetalhesDaRefeicao {
  meal_time: string;
  prep_minutes: number | null;
  difficulty: DificuldadeDoPreparo | null;
  servings: number | null;
}

interface EditMealDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (detalhes: DetalhesDaRefeicao) => void;
  meal: DietMeal | null;
}

/** O valor do select, conferido contra os níveis que o banco aceita. */
function dificuldadeEscolhida(valor: string): DificuldadeDoPreparo | "" {
  return DIFICULDADES_DO_PREPARO.find((nivel) => nivel === valor) ?? "";
}

/** Campo numérico vazio é "não informado", e não zero: o aluno não vê a linha. */
function numeroOuNulo(texto: string): number | null {
  const valor = Number.parseInt(texto, 10);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

/**
 * Horário e preparo de uma refeição do plano.
 *
 * Tempo, dificuldade e porções aparecem para o aluno no detalhe da refeição
 * ("25 min · Fácil · 1 porção", issue #298). Os três são opcionais: sem valor,
 * o aluno não vê a linha — melhor que um tempo inventado.
 *
 * Monte com `key={meal?.id}`: o estado nasce da refeição aberta, e sem a chave
 * abrir outra refeição mostraria os valores da anterior.
 *
 * @example
 * <EditMealDetailsModal key={meal?.id} isOpen meal={meal} onClose={fechar} onSave={salvar} />
 */
export function EditMealDetailsModal({ isOpen, onClose, onSave, meal }: EditMealDetailsModalProps) {
  const [time, setTime] = useState(meal?.meal_time?.slice(0, 5) || "08:00");
  const [minutos, setMinutos] = useState(meal?.prep_minutes ? String(meal.prep_minutes) : "");
  const [dificuldade, setDificuldade] = useState<DificuldadeDoPreparo | "">(meal?.difficulty ?? "");
  const [porcoes, setPorcoes] = useState(meal?.servings ? String(meal.servings) : "");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      meal_time: time,
      prep_minutes: numeroOuNulo(minutos),
      difficulty: dificuldade || null,
      servings: numeroOuNulo(porcoes),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Horário e preparo" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-background/50 rounded-lg p-4 border border-overlay-08">
          <p className="text-sm font-medium text-foreground">{meal?.name ?? ""}</p>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-muted-foreground">Horário</span>
          <CustomTimePicker value={time} onChange={setTime} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Preparo (min)" htmlFor="preparo-minutos" optional>
            <Input
              id="preparo-minutos"
              type="number"
              min={1}
              max={600}
              inputMode="numeric"
              value={minutos}
              onChange={(event) => setMinutos(event.target.value)}
            />
          </FormField>
          <FormField label="Dificuldade" htmlFor="preparo-dificuldade" optional>
            <select
              id="preparo-dificuldade"
              value={dificuldade}
              onChange={(event) => setDificuldade(dificuldadeEscolhida(event.target.value))}
              className={`${FILTER_SELECT_CLASS} w-full`}
            >
              <option value="">—</option>
              {DIFICULDADES_DO_PREPARO.map((valor) => (
                <option key={valor} value={valor}>
                  {textoDaDificuldade(valor)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Porções" htmlFor="preparo-porcoes" optional>
            <Input
              id="preparo-porcoes"
              type="number"
              min={1}
              max={20}
              inputMode="numeric"
              value={porcoes}
              onChange={(event) => setPorcoes(event.target.value)}
            />
          </FormField>
        </div>
        <p className="text-xs text-muted-foreground">
          O aluno vê o tempo, a dificuldade e as porções no detalhe da refeição. Deixe em branco o
          que não quiser informar.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Dialog>
  );
}
