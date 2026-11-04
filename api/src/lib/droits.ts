// Droits du modèle imposé : admin tous droits, coordinatrice tous droits sur son projet,
// animatrice seulement ses propres séances. Pas de connexion : le rôle vient de "qui êtes-vous".

export type ContexteDroits = {
  profil: "admin" | "membre";
  rolesParProjet: Record<string, string[]>;
};

export function peutGererProjet(ctx: ContexteDroits, projetId: string): boolean {
  if (ctx.profil === "admin") return true;
  return (ctx.rolesParProjet[projetId] ?? []).includes("coordinatrice");
}

export function peutModifierSeance(
  ctx: ContexteDroits,
  projetId: string,
  animatriceId: string | null,
  membreId: string,
): boolean {
  if (peutGererProjet(ctx, projetId)) return true;
  const estAnimatriceDuProjet = (ctx.rolesParProjet[projetId] ?? []).includes("animatrice");
  return estAnimatriceDuProjet && animatriceId === membreId;
}
