"use client";

import { useEffect, useState } from "react";
import { api, type Identite } from "@/lib/api";

type VueId = "admin" | "beneficiaire" | "financeuse" | "animateur";

const VUES: { id: VueId; titre: string; description: string; icone: string; disponible: boolean }[] = [
  { id: "admin", titre: "Administration", description: "Pilotage des projets, import et répartition", icone: "🧭", disponible: true },
  { id: "beneficiaire", titre: "Institution bénéficiaire", description: "Écoles et enseignants accueillant une intervention", icone: "🏫", disponible: false },
  { id: "financeuse", titre: "Institution financeuse", description: "Suivi des financements et des bilans", icone: "🤝", disponible: false },
  { id: "animateur", titre: "Animateur·rice", description: "Vos séances et votre planning", icone: "🌿", disponible: true },
];

function appartientAVue(m: Identite, vue: VueId): boolean {
  if (vue === "admin") return m.profil === "admin" || m.equipes.some((e) => e.roles.includes("coordinatrice"));
  if (vue === "animateur") return m.equipes.some((e) => e.roles.includes("animatrice"));
  return false;
}

export function QuiEtesVous({ onChoisi }: { onChoisi: (identite: Identite) => void }) {
  const [membres, setMembres] = useState<Identite[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vue, setVue] = useState<VueId | null>(null);

  useEffect(() => {
    api
      .membres()
      .then((m) => setMembres(m))
      .catch((e) => setErreur(String(e.message ?? e)));
  }, []);

  const vueActive = VUES.find((v) => v.id === vue) ?? null;
  const membresVue = vue ? membres.filter((m) => appartientAVue(m, vue)) : [];

  return (
    <main className="qui-etes-vous-hero">
      <section className="hero-bandeau">
        <span className="hero-eyebrow">Association loi 1901 · Côte d&rsquo;Azur</span>
        <h1>Méditerranée 2000</h1>
        <p>Des interventions pédagogiques pour sensibiliser les écoles au littoral méditerranéen.</p>
      </section>

      <section className="hero-section">
        <h2 className="hero-section-titre">Choisissez votre espace</h2>
        <p className="hero-section-soustitre">Sélectionnez votre profil pour accéder à votre tableau de bord.</p>
        {erreur && <p style={{ color: "crimson", textAlign: "center" }}>Impossible de charger les membres : {erreur}</p>}

        <div className="vues-grille">
          {VUES.map((v) => (
            <button
              key={v.id}
              className={`vue-carte ${vue === v.id ? "vue-carte--active" : ""} ${!v.disponible ? "vue-carte--bientot" : ""}`}
              onClick={() => setVue(v.id)}
            >
              <span className="vue-carte-icone">{v.icone}</span>
              <strong>{v.titre}</strong>
              <span className="vue-carte-description">{v.description}</span>
              {!v.disponible && <span className="vue-carte-badge">Bientôt</span>}
            </button>
          ))}
        </div>

        {vueActive && !vueActive.disponible && (
          <p className="vue-note">Cet espace n&rsquo;est pas encore disponible dans cette version de démonstration.</p>
        )}

        {vueActive && vueActive.disponible && (
          <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem", maxWidth: 560, marginInline: "auto" }}>
            {membresVue.length === 0 && <p>Aucun membre pour cet espace.</p>}
            {membresVue.map((m) => (
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
        )}
      </section>

      <footer className="site-footer">
        <p>Méditerranée 2000 — association de sensibilisation à l&rsquo;environnement littoral, Côte d&rsquo;Azur.</p>
      </footer>
    </main>
  );
}
