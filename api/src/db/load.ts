// Charge les 19 CSV du jeu de test, dans l'ordre imposé par la passation.
// Les erreurs volontaires du jeu de test (dates en texte libre, etc.) ne sont pas corrigées :
// une valeur non interprétable devient NULL plutôt que de faire échouer le chargement.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { parseCsv } from "./csv.ts";
import { typeColonne, type Modele } from "./schema.ts";

const ORDRE_CHARGEMENT = [
  "tag",
  "membre",
  "programme",
  "institution",
  "contact",
  "projet",
  "financement",
  "equipe_projet",
  "classe",
  "fichier_projet",
  "inscription",
  "modele",
  "seance",
  "participation",
  "changement",
  "evenement_agenda",
  "message",
  "questionnaire",
  "rapport",
] as const;

type Attribut = { n: string; t: string };

function convertir(
  attr: Attribut,
  cell: string,
  entiteKey: string,
  tagIndex: Map<string, string>,
): unknown {
  if (cell === "") return null;
  const type = typeColonne(attr);
  switch (type) {
    case "integer": {
      const n = parseInt(cell, 10);
      return Number.isNaN(n) ? null : n;
    }
    case "boolean":
      return cell.trim().toLowerCase() === "true";
    case "date":
    case "timestamp":
      return Number.isNaN(Date.parse(cell.replace(" ", "T"))) ? null : cell;
    case "jsonb":
      try {
        return JSON.stringify(JSON.parse(cell));
      } catch {
        return JSON.stringify({ brut: cell });
      }
    case "uuid[]": {
      const valeurs = cell
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      if (attr.t.startsWith("liste →")) return valeurs;
      const famille = `${entiteKey}.${attr.n}`;
      return valeurs
        .map((libelle) => tagIndex.get(`${famille}::${libelle}`))
        .filter((id): id is string => Boolean(id));
    }
    default:
      return cell;
  }
}

export async function loadCsvData(pool: Pool, modele: Modele, dataDir: string): Promise<void> {
  const parKey = new Map(modele.entites.map((e) => [e.key, e]));

  const tagRows = parseCsv(readFileSync(join(dataDir, "csv", "tag.csv"), "utf8"));
  const tagIndex = new Map<string, string>();
  for (const r of tagRows) tagIndex.set(`${r.famille}::${r.libelle}`, r.id);

  for (const key of ORDRE_CHARGEMENT) {
    const entite = parKey.get(key);
    if (!entite) throw new Error(`entité absente du modèle : ${key}`);
    const rows = parseCsv(readFileSync(join(dataDir, "csv", `${key}.csv`), "utf8"));

    for (const row of rows) {
      const colonnes = entite.attrs.map((a) => a.n);
      const valeurs = entite.attrs.map((a) => convertir(a, row[a.n] ?? "", key, tagIndex));
      const placeholders = colonnes.map((_, i) => `$${i + 1}`).join(", ");
      await pool.query(
        `insert into "${key}" (${colonnes.map((c) => `"${c}"`).join(", ")}) ` +
          `values (${placeholders}) on conflict (id) do nothing`,
        valeurs,
      );
    }
    console.log(`migration : ${rows.length} lignes chargées dans "${key}"`);
  }
}
