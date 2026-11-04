import { describe, expect, it } from "vitest";
import { buildSchemaSql, colonneFkCible, typeColonne } from "./schema.ts";

describe("buildSchemaSql", () => {
  it("contraint une énumération à ses valeurs autorisées", () => {
    const sql = buildSchemaSql({
      entites: [
        {
          key: "projet",
          attrs: [
            { n: "id", t: "UUID v7", f: "pk" },
            { n: "statut", t: "énumération (valeur unique)", valeurs: ["validé", "clos"] },
          ],
        },
      ],
    }).join("\n");
    expect(sql).toContain('"statut" in (\'validé\', \'clos\')');
  });

  it("résout la cible d'une clé étrangère depuis son nom affiché", () => {
    expect(colonneFkCible("→ Projet (UUID v7)")).toBe("projet");
    expect(colonneFkCible("liste → Inscription (UUID v7)")).toBe("inscription");
  });

  it("rejette un type de colonne inconnu plutôt que de l'ignorer silencieusement", () => {
    expect(() => typeColonne({ n: "x", t: "inconnu" })).toThrow();
  });
});
