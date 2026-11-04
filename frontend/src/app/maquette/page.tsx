export default function Maquette() {
  return (
    <main className="board">
      <h1 className="board-titre">Méditerranée 2000 — aperçu de plateforme (maquette, non fonctionnelle)</h1>
      <div className="board-grille">
        <div className="board-ecran">
          <div className="board-ecran-barre">Connexion</div>
          <div className="board-ecran-corps board-ecran-corps--centre">
            <div className="board-logo">M2000</div>
            <p className="board-souslogo">Interventions pédagogiques scolaires</p>
            <div className="board-cartes-profil">
              <div className="board-carte-profil">🧭 Coordinateur / Admin</div>
              <div className="board-carte-profil">🗂️ Assistant fonctionnel</div>
              <div className="board-carte-profil">🏫 École / Enseignant</div>
              <div className="board-carte-profil">🌿 Animateur</div>
            </div>
          </div>
        </div>

        <div className="board-ecran">
          <div className="board-ecran-barre">Tableau de bord coordinateur</div>
          <div className="board-ecran-corps">
            <div className="board-kpis">
              <div className="board-kpi"><strong>12</strong><span>écoles</span></div>
              <div className="board-kpi"><strong>38</strong><span>classes</span></div>
              <div className="board-kpi"><strong>24</strong><span>planifiées</span></div>
              <div className="board-kpi board-kpi--accent"><strong>6</strong><span>à valider</span></div>
            </div>
            <div className="board-secteurs">
              {["Nice", "Cannes", "Antibes", "Grasse", "Mandelieu"].map((commune) => (
                <span key={commune} className="board-tag">{commune}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="board-ecran">
          <div className="board-ecran-barre">Portail enseignant — créneaux</div>
          <div className="board-ecran-corps">
            <p className="board-note">Les créneaux dépendent de votre secteur géographique.</p>
            <div className="board-creneaux">
              <div className="board-creneau board-creneau--dispo">Lun. matin</div>
              <div className="board-creneau board-creneau--bientot">Lun. am</div>
              <div className="board-creneau board-creneau--complet">Mar. matin</div>
              <div className="board-creneau board-creneau--dispo">Mar. am</div>
              <div className="board-creneau board-creneau--dispo">Mer. matin</div>
              <div className="board-creneau board-creneau--complet">Mer. am</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
