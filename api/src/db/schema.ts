// Génère le DDL Postgres à partir de modele_donnees.json (19 entités), sans réécrire le schéma à la main.
// Voir passation/donnees/CONSIGNES-DONNEES.md pour les règles d'origine.

type Attribut = { n: string; t: string; f?: string; valeurs?: string[] };
type Entite = { key: string; attrs: Attribut[] };
export type Modele = { entites: Entite[] };

// Les types FK ("→ Membre (UUID v7)") citent le nom affiché de l'entité, pas sa clé.
const CIBLE_FK: Record<string, string> = {
  Programme: "programme",
  Projet: "projet",
  Institution: "institution",
  Classe: "classe",
  Contact: "contact",
  Inscription: "inscription",
  Membre: "membre",
  Séance: "seance",
  "Modèle de message": "modele",
  Financement: "financement",
};

function ident(n: string): string {
  return `"${n}"`;
}

function litteral(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

export function colonneFkCible(type: string): string | undefined {
  const m = type.match(/^(?:liste )?→\s*(.+?)\s*\(UUID v7\)$/);
  return m ? CIBLE_FK[m[1]] : undefined;
}

export function typeColonne(attr: Attribut): string {
  const t = attr.t;
  if (t === "UUID v7") return "uuid";
  if (t === "texte" || t === "fichier") return "text";
  if (t === "entier") return "integer";
  if (t === "booléen") return "boolean";
  if (t === "date") return "date";
  if (t === "date-heure") return "timestamp";
  if (t === "structure") return "jsonb";
  if (t === "tags (multi)") return "uuid[]";
  if (t === "énumération (valeur unique)") return "text";
  if (t.startsWith("liste →")) return "uuid[]";
  if (t.startsWith("→")) return "uuid";
  throw new Error(`type de colonne inconnu dans le modèle : ${t}`);
}

export function buildSchemaSql(modele: Modele): string[] {
  const statements: string[] = [];

  for (const entite of modele.entites) {
    const colonnes = entite.attrs.map((a) => {
      let def = `  ${ident(a.n)} ${typeColonne(a)}`;
      if (a.f?.includes("pk")) def += " primary key";
      if (a.t === "énumération (valeur unique)" && a.valeurs?.length) {
        def += ` check (${ident(a.n)} is null or ${ident(a.n)} in (${a.valeurs.map(litteral).join(", ")}))`;
      }
      return def;
    });
    statements.push(`create table if not exists ${ident(entite.key)} (\n${colonnes.join(",\n")}\n);`);
  }

  for (const entite of modele.entites) {
    for (const attr of entite.attrs) {
      if (!attr.t.startsWith("→")) continue;
      const cible = colonneFkCible(attr.t);
      if (!cible) continue;
      const contrainte = `${entite.key}_${attr.n}_fkey`;
      statements.push(
        `do $$ begin\n` +
          `  alter table ${ident(entite.key)} add constraint ${ident(contrainte)} ` +
          `foreign key (${ident(attr.n)}) references ${ident(cible)}(id);\n` +
          `exception when duplicate_object then null;\n` +
          `end $$;`,
      );
    }
  }

  return statements;
}
