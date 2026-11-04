import { describe, expect, it } from "vitest";
import { champsManquants } from "./champs-manquants.ts";

describe("champsManquants", () => {
  it("ne signale rien quand tout est renseigné", () => {
    expect(
      champsManquants({
        institutionNom: "École Jean Moulin",
        institutionAdresse: "1 rue des Oliviers",
        institutionCommune: "Cannes",
        contactEmail: "enseignant@ecole.fr",
        classeLibelle: "CM1",
        classeEffectif: 24,
      }),
    ).toEqual([]);
  });

  it("liste les champs vides, et accepte un téléphone à la place d'un e-mail", () => {
    const manquants = champsManquants({
      institutionNom: "",
      institutionCommune: "Cannes",
      contactTelephone: "0600000000",
      classeEffectif: null,
    });
    expect(manquants).toContain("nom de l'établissement");
    expect(manquants).toContain("adresse");
    expect(manquants).toContain("classe");
    expect(manquants).toContain("nombre d'élèves");
    expect(manquants).not.toContain("contact enseignant (e-mail ou téléphone)");
  });
});
