"use client";

import { useEffect, useState } from "react";
import { api, type Identite } from "@/lib/api";

export function QuiEtesVous({ onChoisi }: { onChoisi: (identite: Identite) => void }) {
  const [membres, setMembres] = useState<Identite[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api
      .membres()
      .then((m) => setMembres(m))
      .catch((e) => setErreur(String(e.message ?? e)));
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
      <h1>Qui êtes-vous ?</h1>
      <p>Choisissez la personne que vous incarnez pour tester l&rsquo;application.</p>
      {erreur && <p style={{ color: "crimson" }}>Impossible de charger les membres : {erreur}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {membres.map((m) => (
          <li key={m.membreId}>
            <button
              onClick={() => onChoisi(m)}
              style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", cursor: "pointer" }}
            >
              <span className="carte-membre">
                <span className="carte-membre-avatar">{m.prenom.charAt(0).toUpperCase()}</span>
                <span>
                  <strong>{m.prenom}</strong>
                  <br />
                  {m.profil === "admin" ? "admin" : m.equipes.map((e) => e.roles.join(", ")).join(" · ") || "membre sans rôle"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
