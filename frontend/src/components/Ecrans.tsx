"use client";

import { useEffect, useState } from "react";
import { api, type Identite, type InscriptionLigne } from "@/lib/api";

const CHAMPS_IMPORT = [
  "institution_nom",
  "institution_adresse",
  "institution_commune",
  "enseignant_nom",
  "enseignant_email",
  "enseignant_telephone",
  "classe_niveau",
  "classe_libelle",
  "effectif",
] as const;

function parserCsvColle(texte: string): Record<string, string | number>[] {
  const lignes = texte.trim().split("\n").filter(Boolean);
  return lignes.map((ligne) => {
    const valeurs = ligne.split(",").map((v) => v.trim());
    const obj: Record<string, string | number> = {};
    CHAMPS_IMPORT.forEach((champ, i) => {
      obj[champ] = champ === "effectif" ? Number(valeurs[i] || 0) || undefined! : (valeurs[i] ?? "");
    });
    return obj;
  });
}

export function EcranImport({ identite, projetId, onImporte }: { identite: Identite; projetId: string; onImporte: () => void }) {
  const [texte, setTexte] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function importer() {
    try {
      const lignes = parserCsvColle(texte);
      const { importees } = await api.importer(projetId, lignes, identite.membreId);
      setMessage(`${importees} inscription(s) importée(s).`);
      setTexte("");
      onImporte();
    } catch (e) {
      setMessage(`Échec de l'import : ${(e as Error).message}`);
    }
  }

  return (
    <section>
      <h2>Import du fichier d&rsquo;inscrits</h2>
      <p>
        Collez une ligne par classe, colonnes séparées par des virgules, dans l&rsquo;ordre :<br />
        <code>{CHAMPS_IMPORT.join(", ")}</code>
      </p>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={8}
        style={{ width: "100%", fontFamily: "monospace" }}
        placeholder="École Jean Moulin, 1 rue des Oliviers, Cannes, Mme Dupont, dupont@ecole.fr, , CM1, CM1 A, 24"
      />
      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={importer} disabled={!texte.trim()}>Importer</button>
      </div>
      {message && <p>{message}</p>}
    </section>
  );
}

export function EcranInscriptions({ identite, projetId }: { identite: Identite; projetId: string }) {
  const [lignes, setLignes] = useState<InscriptionLigne[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let annule = false;
    api.inscriptions(projetId).then(
      (l) => { if (!annule) setLignes(l); },
      (e) => { if (!annule) setErreur(String(e.message ?? e)); },
    );
    return () => { annule = true; };
  }, [projetId, version]);

  async function corriger(id: string, champ: string, valeur: string) {
    await api.corrigerInscription(id, { [champ]: champ === "effectif_declare" ? Number(valeur) || null : valeur }, identite.membreId);
    setVersion((v) => v + 1);
  }

  return (
    <section>
      <h2>Liste des inscriptions</h2>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Établissement</th>
            <th align="left">Commune</th>
            <th align="left">Classe</th>
            <th align="left">Effectif</th>
            <th align="left">Champs manquants</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{l.institution_nom}</td>
              <td>
                <input
                  defaultValue={l.institution_commune ?? ""}
                  onBlur={(e) => e.target.value !== (l.institution_commune ?? "") && corriger(l.id, "institution_commune", e.target.value)}
                />
              </td>
              <td>
                <input
                  defaultValue={l.classe_libelle ?? ""}
                  onBlur={(e) => e.target.value !== (l.classe_libelle ?? "") && corriger(l.id, "classe_libelle", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={l.effectif_declare ?? ""}
                  style={{ width: "5rem" }}
                  onBlur={(e) => e.target.value !== String(l.effectif_declare ?? "") && corriger(l.id, "effectif_declare", e.target.value)}
                />
              </td>
              <td style={{ color: l.champsManquants.length ? "crimson" : "inherit" }}>
                {l.champsManquants.join(", ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SeanceForm({ inscriptionId, identite, onEnregistre }: { inscriptionId: string; identite: Identite; onEnregistre: () => void }) {
  const [debut, setDebut] = useState("");
  const [lieu, setLieu] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    try {
      await api.saisirSeance(inscriptionId, { debut, lieu }, identite.membreId);
      setErreur(null);
      onEnregistre();
    } catch (e) {
      setErreur((e as Error).message);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
      <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
      <input placeholder="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} style={{ width: "6rem" }} />
      <button onClick={enregistrer} disabled={!debut}>Enregistrer la séance</button>
      {erreur && <span style={{ color: "crimson" }}>{erreur}</span>}
    </div>
  );
}

export function EcranRepartition({ identite, projetId }: { identite: Identite; projetId: string }) {
  const [zones, setZones] = useState<{ commune: string; inscriptionIds: string[] }[]>([]);
  const [affectations, setAffectations] = useState<Record<string, string | null>>({});
  const [equipe, setEquipe] = useState<{ membre_id: string; prenom: string; roles: string[] }[]>([]);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let annule = false;
    Promise.all([api.repartition(projetId), api.equipe(projetId)]).then(([rep, eq]) => {
      if (annule) return;
      setZones(rep.zones);
      setAffectations(Object.fromEntries(rep.affectations.map((a) => [a.inscriptionId, a.animatriceId])));
      setEquipe(eq);
    });
    return () => { annule = true; };
  }, [projetId, version]);

  const animatrices = equipe.filter((m) => m.roles.includes("animatrice"));

  async function affecter(inscriptionId: string, membreId: string) {
    await api.affecter(inscriptionId, membreId, identite.membreId);
    setVersion((v) => v + 1);
  }

  return (
    <section>
      <h2>Répartition par zone géographique</h2>
      <p>Zone = commune de l&rsquo;établissement (le modèle imposé n&rsquo;a pas de champ zone dédié).</p>
      {zones.map((z) => (
        <div key={z.commune} style={{ marginBottom: "1rem" }}>
          <h3>{z.commune} ({z.inscriptionIds.length})</h3>
          {z.inscriptionIds.map((id) => (
            <div key={id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
              <select
                value={affectations[id] ?? ""}
                onChange={(e) => affecter(id, e.target.value)}
                style={{ minWidth: "10rem" }}
              >
                <option value="">— à affecter —</option>
                {animatrices.map((a) => (
                  <option key={a.membre_id} value={a.membre_id}>{a.prenom}</option>
                ))}
              </select>
              <SeanceForm inscriptionId={id} identite={identite} onEnregistre={() => setVersion((v) => v + 1)} />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export function EcranAnimatrice({ identite }: { identite: Identite }) {
  const [lignes, setLignes] = useState<Awaited<ReturnType<typeof api.mesInscriptions>>>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let annule = false;
    api.mesInscriptions(identite.membreId).then((l) => { if (!annule) setLignes(l); });
    return () => { annule = true; };
  }, [identite.membreId, version]);

  return (
    <section>
      <h2>Mes classes et séances</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Établissement</th>
            <th align="left">Classe</th>
            <th align="left">Séance</th>
            <th align="left">Statut</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{l.institution_nom} ({l.institution_commune})</td>
              <td>{l.classe_libelle}</td>
              <td>
                {l.debut ? new Date(l.debut).toLocaleString("fr-FR") : <SeanceForm inscriptionId={l.id} identite={identite} onEnregistre={() => setVersion((v) => v + 1)} />}
              </td>
              <td>{l.seance_statut ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
