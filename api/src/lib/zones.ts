// Regroupe les classes par zone géographique pour l'écran de répartition (étape 3 du scénario) :
// faute de champ "zone" dans le modèle imposé, la commune de l'institution en tient lieu.

export type ClassePourZone = {
  inscriptionId: string;
  commune: string | null;
};

export type ZoneGroupee = { commune: string; inscriptionIds: string[] };

export function grouperParZone(classes: ClassePourZone[]): ZoneGroupee[] {
  const parCommune = new Map<string, string[]>();
  for (const c of classes) {
    const commune = c.commune?.trim() || "commune inconnue";
    const liste = parCommune.get(commune) ?? [];
    liste.push(c.inscriptionId);
    parCommune.set(commune, liste);
  }
  return [...parCommune.entries()]
    .map(([commune, inscriptionIds]) => ({ commune, inscriptionIds }))
    .sort((a, b) => b.inscriptionIds.length - a.inscriptionIds.length);
}
