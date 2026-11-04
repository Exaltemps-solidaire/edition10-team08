// Appels à l'API en chemin relatif uniquement : même origine, pas de CORS, pas d'URL absolue.

export type Identite = {
  membreId: string;
  prenom: string;
  profil: "admin" | "membre";
  equipes: { projet_id: string; roles: string[] }[];
};

async function appel<T>(chemin: string, options: RequestInit = {}, membreId?: string | null): Promise<T> {
  const entetes: Record<string, string> = { "Content-Type": "application/json" };
  if (membreId) entetes["x-membre-id"] = membreId;
  const reponse = await fetch(`/api/v1${chemin}`, { ...options, headers: { ...entetes, ...(options.headers ?? {}) } });
  if (!reponse.ok) {
    const corps = await reponse.json().catch(() => ({}));
    throw new Error((corps as { erreur?: string }).erreur ?? `erreur ${reponse.status}`);
  }
  if (reponse.status === 204) return undefined as T;
  return reponse.json();
}

type MembreApi = { id: string; prenom: string; profil: "admin" | "membre"; equipes: { projet_id: string; roles: string[] }[] };

export const api = {
  membres: async () => {
    const membres = await appel<MembreApi[]>("/membres");
    return membres.map((m) => ({ membreId: m.id, prenom: m.prenom, profil: m.profil, equipes: m.equipes }));
  },
  projets: () => appel<{ id: string; nom: string; annee_scolaire: string; statut: string }[]>("/projets"),
  equipe: (projetId: string) =>
    appel<{ id: string; membre_id: string; prenom: string; roles: string[] }[]>(`/projets/${projetId}/equipe`),
  importer: (projetId: string, lignes: unknown[], membreId: string) =>
    appel<{ importees: number }>(`/projets/${projetId}/import`, { method: "POST", body: JSON.stringify({ lignes }) }, membreId),
  inscriptions: (projetId: string) =>
    appel<InscriptionLigne[]>(`/projets/${projetId}/inscriptions`),
  corrigerInscription: (id: string, champs: Record<string, unknown>, membreId: string) =>
    appel(`/inscriptions/${id}`, { method: "PATCH", body: JSON.stringify(champs) }, membreId),
  repartition: (projetId: string) =>
    appel<{ zones: { commune: string; inscriptionIds: string[] }[]; affectations: { inscriptionId: string; animatriceId: string | null }[] }>(
      `/projets/${projetId}/repartition`,
    ),
  affecter: (inscriptionId: string, membreIdCible: string, membreId: string) =>
    appel(`/inscriptions/${inscriptionId}/affecter`, { method: "POST", body: JSON.stringify({ membreId: membreIdCible }) }, membreId),
  mesInscriptions: (membreId: string) => appel<InscriptionAnimatrice[]>(`/membres/${membreId}/inscriptions`),
  saisirSeance: (
    inscriptionId: string,
    seance: { debut: string; fin?: string; lieu?: string; statut?: string },
    membreId: string,
  ) => appel(`/inscriptions/${inscriptionId}/seances`, { method: "POST", body: JSON.stringify(seance) }, membreId),
};

export type InscriptionLigne = {
  id: string;
  statut: string;
  animatrice_id: string | null;
  classe_id: string;
  classe_niveau: string | null;
  classe_libelle: string | null;
  effectif_declare: number | null;
  institution_id: string;
  institution_nom: string | null;
  institution_adresse: string | null;
  institution_commune: string | null;
  contact_email: string | null;
  contact_telephone: string | null;
  contact_nom: string | null;
  champsManquants: string[];
};

export type InscriptionAnimatrice = {
  id: string;
  statut: string;
  projet_id: string;
  classe_libelle: string | null;
  effectif_declare: number | null;
  institution_nom: string | null;
  institution_commune: string | null;
  seance_id: string | null;
  debut: string | null;
  fin: string | null;
  lieu: string | null;
  seance_statut: string | null;
};
