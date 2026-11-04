"use client";

import { useEffect, useState } from "react";
import { api, type Identite } from "@/lib/api";
import { QuiEtesVous } from "@/components/QuiEtesVous";
import { EcranImport, EcranInscriptions, EcranRepartition, EcranAnimatrice } from "@/components/Ecrans";

export default function Home() {
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [projetFallbackId, setProjetFallbackId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!identite || identite.equipes[0]) return;
    api.projets().then((projets) => setProjetFallbackId(projets[0]?.id ?? null));
  }, [identite]);

  if (!identite) {
    return <QuiEtesVous onChoisi={setIdentite} />;
  }

  const projetId = identite.equipes[0]?.projet_id ?? projetFallbackId;

  const roles = identite.equipes.find((e) => e.projet_id === projetId)?.roles ?? [];
  const peutGerer = identite.profil === "admin" || roles.includes("coordinatrice");
  const estAnimatrice = roles.includes("animatrice");

  return (
    <main style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        Connecté·e en tant que <strong>{identite.prenom}</strong>{" "}
        <button onClick={() => setIdentite(null)}>changer</button>
      </p>
      {!projetId && <p>Chargement du projet…</p>}
      {projetId && peutGerer && (
        <>
          <EcranImport identite={identite} projetId={projetId} onImporte={() => setVersion((v) => v + 1)} />
          <EcranInscriptions key={version} identite={identite} projetId={projetId} />
          <EcranRepartition key={version} identite={identite} projetId={projetId} />
        </>
      )}
      {projetId && estAnimatrice && !peutGerer && <EcranAnimatrice identite={identite} />}
      {projetId && !peutGerer && !estAnimatrice && <p>Aucun rôle reconnu sur ce projet.</p>}
    </main>
  );
}
