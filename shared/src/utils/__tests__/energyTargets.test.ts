import { describe, expect, it } from "vitest";
import {
  calculateMacrosFromCalories,
  calculateTargetCalories,
  calculateTDEE,
  calculateTMB,
} from "../energyTargets";

describe("calculateTMB (Mifflin-St Jeor)", () => {
  it("homem: 10·peso + 6,25·altura − 5·idade + 5", () => {
    expect(calculateTMB({ weightKg: 80, heightCm: 180, age: 30, sex: "M" })).toBe(1780);
  });

  it("mulher: 10·peso + 6,25·altura − 5·idade − 161", () => {
    expect(calculateTMB({ weightKg: 60, heightCm: 165, age: 28, sex: "F" })).toBe(1330);
  });
});

describe("calculateTDEE", () => {
  it("multiplica a TMB pelo fator de atividade", () => {
    expect(calculateTDEE(1780, "moderate")).toBe(Math.round(1780 * 1.55));
  });
});

describe("calculateTargetCalories", () => {
  it("corta 20% no cutting, soma 10% no bulking e mantém na manutenção", () => {
    expect(calculateTargetCalories(2500, "cutting")).toBe(2000);
    expect(calculateTargetCalories(2500, "bulking")).toBe(2750);
    expect(calculateTargetCalories(2500, "maintenance")).toBe(2500);
  });
});

describe("calculateMacrosFromCalories", () => {
  // Proteína e gordura saem do peso; o carbo fica com o que sobra da energia.
  it("no cutting, 2,2 g/kg de proteína e 0,8 g/kg de gordura", () => {
    const macros = calculateMacrosFromCalories(2000, 80, "cutting");

    expect(macros).toEqual({ calories: 2000, protein: 176, fat: 64, carbs: 180 });
  });

  it("nunca devolve carbo negativo quando a energia não cobre proteína e gordura", () => {
    expect(calculateMacrosFromCalories(800, 100, "cutting").carbs).toBe(0);
  });
});
