const NAV = [
  "🏠 Tableau de bord",
  "📥 Import dossiers",
  "🏫 Écoles",
  "👨‍🏫 Enseignants",
  "🧑‍💼 Animateurs",
  "📅 Planning",
  "🤖 Planification automatique",
  "📦 Gestion matériels",
  "📨 Notifications",
  "⚙️ Paramètres",
];

const KPIS = [
  { label: "Écoles inscrites", valeur: "189", evolution: "+6%" },
  { label: "Classes enregistrées", valeur: "842", evolution: "+3%" },
  { label: "Interventions planifiées", valeur: "654", evolution: "+11%" },
  { label: "Animateurs actifs", valeur: "52", evolution: "+2%" },
];

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const ANIMATEURS = ["C. Dubois", "S. Martel", "N. Rivière"];
const PLANNING: Record<string, string> = {
  "C. Dubois-Lun": "confirme", "C. Dubois-Mar": "planifie", "C. Dubois-Jeu": "conflit",
  "S. Martel-Mar": "confirme", "S. Martel-Mer": "attente", "S. Martel-Ven": "confirme",
  "N. Rivière-Lun": "planifie", "N. Rivière-Mer": "confirme", "N. Rivière-Ven": "attente",
};

const ALERTES = [
  "Intervention sans animateur — École Jules Ferry",
  "Matériel en attente de transfert — Kit Océans",
  "Validation coordinateur requise — 3 dossiers",
  "École n'ayant pas terminé son inscription — Collège Les Oliviers",
];

const ZONES = ["Nice", "Cannes", "Antibes", "Grasse", "Mandelieu", "Cagnes-sur-Mer", "Fréjus"];

export default function MaquetteDashboard() {
  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <div className="dash-logo">Méditerranée 2000</div>
        <nav className="dash-nav">
          {NAV.map((item) => (
            <div key={item} className={`dash-nav-item ${item.startsWith("🏠") ? "dash-nav-item--actif" : ""}`}>{item}</div>
          ))}
        </nav>
        <div className="dash-utilisateur">
          <div className="carte-membre-avatar">C</div>
          <div>
            <strong>Coordinateur principal</strong>
            <br />
            <span style={{ color: "#6b7a73", fontSize: "0.8rem" }}>● Connecté</span>
          </div>
        </div>
      </aside>

      <div className="dash-contenu">
        <header className="dash-header">
          <input className="dash-recherche" placeholder="Rechercher une école, un animateur, une intervention…" readOnly />
          <div className="dash-header-droite">Nouvelle intervention</div>
        </header>

        <main className="dash-grille">
          <div className="kpi-grid" style={{ gridColumn: "1 / -1" }}>
            {KPIS.map((k) => (
              <div key={k.label} className="kpi-tuile">
                <div className="kpi-valeur">{k.valeur}</div>
                <div className="kpi-label">{k.label} <span style={{ color: "var(--accent)" }}>{k.evolution}</span></div>
              </div>
            ))}
          </div>

          <section className="dash-bloc">
            <h3>Planning hebdomadaire</h3>
            <table className="dash-planning">
              <thead>
                <tr>
                  <th></th>
                  {JOURS.map((j) => <th key={j}>{j}</th>)}
                </tr>
              </thead>
              <tbody>
                {ANIMATEURS.map((a) => (
                  <tr key={a}>
                    <td>{a}</td>
                    {JOURS.map((j) => {
                      const statut = PLANNING[`${a}-${j}`];
                      return (
                        <td key={j}>
                          {statut && <span className={`dash-bloc-planning dash-bloc-planning--${statut}`} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="dash-bloc">
            <h3>Notifications prioritaires</h3>
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
              {ALERTES.map((a) => (
                <li key={a} className="dash-alerte">⚠ {a}</li>
              ))}
            </ul>
          </section>

          <section className="dash-bloc">
            <h3>Planification automatique</h3>
            <ul className="dash-algo-liste">
              <li>Interventions à répartir <strong>37</strong></li>
              <li>Animateurs disponibles <strong>18</strong></li>
              <li>Matériel disponible <strong>12 kits</strong></li>
              <li>Taux d&rsquo;optimisation <strong>87%</strong></li>
              <li>Conflits détectés <strong style={{ color: "#c0392b" }}>2</strong></li>
            </ul>
            <button style={{ marginTop: "0.75rem" }}>Lancer la planification</button>
          </section>

          <section className="dash-bloc">
            <h3>Répartition par zone géographique</h3>
            <div className="board-secteurs">
              {ZONES.map((z) => <span key={z} className="board-tag">{z}</span>)}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
