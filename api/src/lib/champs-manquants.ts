// Détecte les champs obligatoires manquants d'une inscription reconstituée depuis un import,
// pour l'écran "liste des inscriptions" (étape 2 du scénario de la passation).

export type InscriptionImportee = {
  institutionNom?: string | null;
  institutionAdresse?: string | null;
  institutionCommune?: string | null;
  contactEmail?: string | null;
  contactTelephone?: string | null;
  classeLibelle?: string | null;
  classeEffectif?: number | null;
};

const vide = (v: string | null | undefined) => v == null || v.trim() === "";

export function champsManquants(i: InscriptionImportee): string[] {
  const manquants: string[] = [];
  if (vide(i.institutionNom)) manquants.push("nom de l'établissement");
  if (vide(i.institutionAdresse)) manquants.push("adresse");
  if (vide(i.institutionCommune)) manquants.push("commune");
  if (vide(i.contactEmail) && vide(i.contactTelephone)) manquants.push("contact enseignant (e-mail ou téléphone)");
  if (vide(i.classeLibelle)) manquants.push("classe");
  if (i.classeEffectif == null) manquants.push("nombre d'élèves");
  return manquants;
}
