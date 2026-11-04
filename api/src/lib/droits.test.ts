import { describe, expect, it } from "vitest";
import { peutGererProjet, peutModifierSeance } from "./droits.ts";

describe("droits", () => {
  it("l'admin peut tout, sur n'importe quel projet", () => {
    expect(peutGererProjet({ profil: "admin", rolesParProjet: {} }, "p1")).toBe(true);
  });

  it("la coordinatrice gère son projet, pas un autre", () => {
    const ctx = { profil: "membre" as const, rolesParProjet: { p1: ["coordinatrice"] } };
    expect(peutGererProjet(ctx, "p1")).toBe(true);
    expect(peutGererProjet(ctx, "p2")).toBe(false);
  });

  it("l'animatrice ne modifie que ses propres séances", () => {
    const ctx = { profil: "membre" as const, rolesParProjet: { p1: ["animatrice"] } };
    expect(peutModifierSeance(ctx, "p1", "m-moi", "m-moi")).toBe(true);
    expect(peutModifierSeance(ctx, "p1", "m-une-autre", "m-moi")).toBe(false);
  });
});
