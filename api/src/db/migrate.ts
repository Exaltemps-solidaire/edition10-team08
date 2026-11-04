// Migration au démarrage : crée le schéma s'il manque, charge le jeu de test s'il est vide.
// Idempotent : rejouable sans effet à chaque redémarrage du conteneur.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { buildSchemaSql, type Modele } from "./schema.ts";
import { loadCsvData } from "./load.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

export async function migrer(pool: Pool): Promise<void> {
  const modele: Modele = JSON.parse(readFileSync(join(DATA_DIR, "modele_donnees.json"), "utf8"));

  for (const statement of buildSchemaSql(modele)) {
    await pool.query(statement);
  }

  const { rows } = await pool.query('select count(*)::int as n from "tag"');
  if (rows[0].n === 0) {
    await loadCsvData(pool, modele, DATA_DIR);
  } else {
    console.log("migration : données déjà présentes, chargement du jeu de test ignoré");
  }
}
