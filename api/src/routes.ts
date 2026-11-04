// Routage de l'API. Le proxy d'entrée envoie /api/... à ce service sans retirer le préfixe :
// les routes métier se déclarent sous /api/v1/... ; /health et /sante restent à la racine.

import { randomUUID } from "node:crypto";
import { pool } from "./db/pool.ts";
import { champsManquants } from "./lib/champs-manquants.ts";
import { grouperParZone } from "./lib/zones.ts";
import { peutGererProjet, peutModifierSeance, type ContexteDroits } from "./lib/droits.ts";

export type Reponse = { statut: number; corps?: unknown };
export type Requete = { body: unknown; membreId: string | null };
type Gestionnaire = (params: string[], req: Requete) => Promise<Reponse>;

const routes: { methode: string; regex: RegExp; gestionnaire: Gestionnaire }[] = [];

function route(methode: string, chemin: string, gestionnaire: Gestionnaire) {
  const regex = new RegExp("^" + chemin.replace(/:[a-z]+/g, "([^/]+)") + "$");
  routes.push({ methode, regex, gestionnaire });
}

// Les rôles sont des tags (valeurs stockées en uuid[]) : on les résout en libellés
// ("coordinatrice", "animatrice") pour pouvoir les comparer dans les règles de droits.
const REQUETE_ROLES_LIBELLES = `
  select e.projet_id,
         coalesce(array_agg(t.libelle) filter (where t.libelle is not null), '{}') as roles
  from "equipe_projet" e
  left join lateral unnest(e.roles) as u(role_id) on true
  left join "tag" t on t.id = u.role_id
  where e.membre_id = $1
  group by e.projet_id
`;

async function chargerContexteDroits(membreId: string | null): Promise<ContexteDroits> {
  if (!membreId) return { profil: "membre", rolesParProjet: {} };
  const { rows: membreRows } = await pool.query('select profil from "membre" where id = $1', [membreId]);
  const profil = membreRows[0]?.profil === "admin" ? "admin" : "membre";
  const { rows: equipeRows } = await pool.query(REQUETE_ROLES_LIBELLES, [membreId]);
  const rolesParProjet: Record<string, string[]> = {};
  for (const r of equipeRows) rolesParProjet[r.projet_id] = r.roles ?? [];
  return { profil, rolesParProjet };
}

// --- Qui êtes-vous ---
route("GET", "/api/v1/membres", async () => {
  const { rows } = await pool.query(
    `select m.id, m.prenom, m.nom, m.profil,
            coalesce(
              json_agg(json_build_object('projet_id', e.projet_id, 'roles', e.roles_libelles))
                filter (where e.projet_id is not null),
              '[]'
            ) as equipes
     from "membre" m
     left join lateral (
       select ep.projet_id,
              coalesce(array_agg(t.libelle) filter (where t.libelle is not null), '{}') as roles_libelles
       from "equipe_projet" ep
       left join lateral unnest(ep.roles) as u(role_id) on true
       left join "tag" t on t.id = u.role_id
       where ep.membre_id = m.id
       group by ep.projet_id
     ) e on true
     group by m.id
     order by m.prenom`,
  );
  return { statut: 200, corps: rows };
});

// --- Projets ---
route("GET", "/api/v1/projets", async () => {
  const { rows } = await pool.query('select id, nom, annee_scolaire, statut from "projet" order by nom');
  return { statut: 200, corps: rows };
});

route("GET", "/api/v1/projets/:id/equipe", async ([id]) => {
  const { rows } = await pool.query(
    `select e.id,
            coalesce(array_agg(t.libelle) filter (where t.libelle is not null), '{}') as roles,
            m.id as membre_id, m.prenom, m.nom
     from "equipe_projet" e
     join "membre" m on m.id = e.membre_id
     left join lateral unnest(e.roles) as u(role_id) on true
     left join "tag" t on t.id = u.role_id
     where e.projet_id = $1
     group by e.id, m.id, m.prenom, m.nom
     order by m.prenom`,
    [id],
  );
  return { statut: 200, corps: rows };
});

// --- Écran 1 : import d'un fichier d'inscrits ---
type LigneImport = {
  institution_nom?: string;
  institution_adresse?: string;
  institution_commune?: string;
  enseignant_nom?: string;
  enseignant_email?: string;
  enseignant_telephone?: string;
  classe_niveau?: string;
  classe_libelle?: string;
  effectif?: number;
};

route("POST", "/api/v1/projets/:id/import", async ([projetId], req) => {
  const body = req.body as { lignes?: LigneImport[] } | null;
  const lignes = body?.lignes ?? [];
  if (!Array.isArray(lignes) || lignes.length === 0) {
    return { statut: 400, corps: { erreur: "lignes manquantes" } };
  }

  const client = await pool.connect();
  const inscriptionIds: string[] = [];
  try {
    await client.query("begin");
    for (const ligne of lignes) {
      const nom = (ligne.institution_nom ?? "").trim();
      const commune = (ligne.institution_commune ?? "").trim();

      let institutionId: string;
      const existante = await client.query(
        'select id from "institution" where nom = $1 and commune = $2',
        [nom || null, commune || null],
      );
      if (existante.rows[0]) {
        institutionId = existante.rows[0].id;
      } else {
        institutionId = randomUUID();
        await client.query(
          'insert into "institution" (id, nom, commune, adresse) values ($1, $2, $3, $4)',
          [institutionId, nom || null, commune || null, ligne.institution_adresse ?? null],
        );
      }

      let contactId: string | null = null;
      if (ligne.enseignant_email || ligne.enseignant_nom) {
        const existant = ligne.enseignant_email
          ? await client.query('select id from "contact" where email = $1', [ligne.enseignant_email])
          : { rows: [] as { id: string }[] };
        if (existant.rows[0]) {
          contactId = existant.rows[0].id;
        } else {
          contactId = randomUUID();
          await client.query(
            'insert into "contact" (id, institution_id, civilite_nom, email, telephone) values ($1, $2, $3, $4, $5)',
            [contactId, institutionId, ligne.enseignant_nom ?? null, ligne.enseignant_email ?? null, ligne.enseignant_telephone ?? null],
          );
        }
      }

      const classeId = randomUUID();
      await client.query(
        'insert into "classe" (id, institution_id, niveau, libelle, effectif_declare, enseignant_id) values ($1, $2, $3, $4, $5, $6)',
        [classeId, institutionId, ligne.classe_niveau ?? null, ligne.classe_libelle ?? null, ligne.effectif ?? null, contactId],
      );

      const inscriptionId = randomUUID();
      await client.query(
        'insert into "inscription" (id, projet_id, classe_id, statut) values ($1, $2, $3, $4)',
        [inscriptionId, projetId, classeId, "demandée"],
      );
      inscriptionIds.push(inscriptionId);
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  return { statut: 201, corps: { importees: inscriptionIds.length, inscriptionIds } };
});

// --- Écran 2 : liste des inscriptions, champs manquants ---
route("GET", "/api/v1/projets/:id/inscriptions", async ([projetId]) => {
  const { rows } = await pool.query(
    `select i.id, i.statut, i.animatrice_id,
            c.id as classe_id, c.niveau as classe_niveau, c.libelle as classe_libelle, c.effectif_declare,
            inst.id as institution_id, inst.nom as institution_nom, inst.adresse as institution_adresse, inst.commune as institution_commune,
            ct.email as contact_email, ct.telephone as contact_telephone, ct.civilite_nom as contact_nom
     from "inscription" i
     join "classe" c on c.id = i.classe_id
     join "institution" inst on inst.id = c.institution_id
     left join "contact" ct on ct.id = c.enseignant_id
     where i.projet_id = $1
     order by inst.commune, inst.nom`,
    [projetId],
  );
  const avecManquants = rows.map((r) => ({
    ...r,
    champsManquants: champsManquants({
      institutionNom: r.institution_nom,
      institutionAdresse: r.institution_adresse,
      institutionCommune: r.institution_commune,
      contactEmail: r.contact_email,
      contactTelephone: r.contact_telephone,
      classeLibelle: r.classe_libelle,
      classeEffectif: r.effectif_declare,
    }),
  }));
  return { statut: 200, corps: avecManquants };
});

route("PATCH", "/api/v1/inscriptions/:id", async ([id], req) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const champsClasse: Record<string, unknown> = {};
  if ("classe_libelle" in body) champsClasse.libelle = body.classe_libelle;
  if ("classe_niveau" in body) champsClasse.niveau = body.classe_niveau;
  if ("effectif_declare" in body) champsClasse.effectif_declare = body.effectif_declare;

  if (Object.keys(champsClasse).length > 0) {
    const { rows } = await pool.query('select classe_id from "inscription" where id = $1', [id]);
    if (!rows[0]) return { statut: 404 };
    const sets = Object.keys(champsClasse).map((c, i) => `"${c}" = $${i + 2}`).join(", ");
    await pool.query(`update "classe" set ${sets} where id = $1`, [rows[0].classe_id, ...Object.values(champsClasse)]);
  }

  if ("institution_adresse" in body || "institution_commune" in body) {
    const { rows } = await pool.query(
      `select inst.id from "inscription" i join "classe" c on c.id = i.classe_id join "institution" inst on inst.id = c.institution_id where i.id = $1`,
      [id],
    );
    if (rows[0]) {
      const sets: string[] = [];
      const vals: unknown[] = [rows[0].id];
      if ("institution_adresse" in body) { sets.push(`adresse = $${vals.length + 1}`); vals.push(body.institution_adresse); }
      if ("institution_commune" in body) { sets.push(`commune = $${vals.length + 1}`); vals.push(body.institution_commune); }
      await pool.query(`update "institution" set ${sets.join(", ")} where id = $1`, vals);
    }
  }

  return { statut: 200, corps: { ok: true } };
});

// --- Écran 3 : répartition par zone, affectation d'une animatrice ---
route("GET", "/api/v1/projets/:id/repartition", async ([projetId]) => {
  const { rows } = await pool.query(
    `select i.id as inscription_id, i.animatrice_id, inst.commune
     from "inscription" i
     join "classe" c on c.id = i.classe_id
     join "institution" inst on inst.id = c.institution_id
     where i.projet_id = $1`,
    [projetId],
  );
  const zones = grouperParZone(rows.map((r) => ({ inscriptionId: r.inscription_id, commune: r.commune })));
  return { statut: 200, corps: { zones, affectations: rows.map((r) => ({ inscriptionId: r.inscription_id, animatriceId: r.animatrice_id })) } };
});

route("POST", "/api/v1/inscriptions/:id/affecter", async ([id], req) => {
  const body = req.body as { membreId?: string } | null;
  if (!body?.membreId) return { statut: 400, corps: { erreur: "membreId manquant" } };

  const { rows } = await pool.query('select projet_id from "inscription" where id = $1', [id]);
  if (!rows[0]) return { statut: 404 };

  const ctx = await chargerContexteDroits(req.membreId);
  if (!peutGererProjet(ctx, rows[0].projet_id)) return { statut: 403, corps: { erreur: "droits insuffisants" } };

  await pool.query('update "inscription" set animatrice_id = $1 where id = $2', [body.membreId, id]);
  return { statut: 200, corps: { ok: true } };
});

// --- Écran 4 : vue animatrice ---
route("GET", "/api/v1/membres/:id/inscriptions", async ([membreId]) => {
  const { rows } = await pool.query(
    `select i.id, i.statut, i.projet_id,
            c.libelle as classe_libelle, c.effectif_declare,
            inst.nom as institution_nom, inst.commune as institution_commune,
            s.id as seance_id, s.debut, s.fin, s.lieu, s.statut as seance_statut
     from "inscription" i
     join "classe" c on c.id = i.classe_id
     join "institution" inst on inst.id = c.institution_id
     left join "seance" s on s.inscription_id = i.id
     where i.animatrice_id = $1
     order by inst.commune, inst.nom`,
    [membreId],
  );
  return { statut: 200, corps: rows };
});

// --- Écran 5 : saisie de séance ---
route("POST", "/api/v1/inscriptions/:id/seances", async ([inscriptionId], req) => {
  const body = req.body as { debut?: string; fin?: string; lieu?: string; statut?: string } | null;
  if (!body?.debut) return { statut: 400, corps: { erreur: "debut manquant" } };

  const { rows } = await pool.query(
    'select projet_id, animatrice_id from "inscription" where id = $1',
    [inscriptionId],
  );
  if (!rows[0]) return { statut: 404 };

  const ctx = await chargerContexteDroits(req.membreId);
  if (!req.membreId || !peutModifierSeance(ctx, rows[0].projet_id, rows[0].animatrice_id, req.membreId)) {
    return { statut: 403, corps: { erreur: "droits insuffisants" } };
  }

  const existante = await pool.query(
    'select id, numero from "seance" where inscription_id = $1 order by numero desc limit 1',
    [inscriptionId],
  );

  if (existante.rows[0]) {
    await pool.query(
      'update "seance" set debut = $1, fin = $2, lieu = $3, statut = coalesce($4, statut) where id = $5',
      [body.debut, body.fin ?? null, body.lieu ?? null, body.statut ?? null, existante.rows[0].id],
    );
    return { statut: 200, corps: { id: existante.rows[0].id } };
  }

  const id = randomUUID();
  await pool.query(
    'insert into "seance" (id, inscription_id, numero, debut, fin, lieu, statut) values ($1, $2, 1, $3, $4, $5, $6)',
    [id, inscriptionId, body.debut, body.fin ?? null, body.lieu ?? null, body.statut ?? "à confirmer"],
  );
  return { statut: 201, corps: { id } };
});

export async function router(methode: string, url: string, requete: Requete): Promise<Reponse> {
  const chemin = new URL(url, "http://api").pathname;
  if (methode === "GET" && (chemin === "/health" || chemin === "/sante")) {
    return { statut: 200, corps: { status: "ok" } };
  }
  for (const r of routes) {
    if (r.methode !== methode) continue;
    const m = chemin.match(r.regex);
    if (m) return r.gestionnaire(m.slice(1), requete);
  }
  return { statut: 404 };
}
