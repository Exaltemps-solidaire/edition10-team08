// Lecture CSV minimale (délimiteur virgule, guillemets doubles, échappement "").
// Suffisant pour le jeu de test imposé ; pas d'usage prévu au-delà.

export function parseCsv(texte: string): Record<string, string>[] {
  const lignes = decouperLignes(texte);
  if (lignes.length === 0) return [];
  const entetes = lignes[0];
  return lignes.slice(1).map((champs) => {
    const ligne: Record<string, string> = {};
    entetes.forEach((nom, i) => {
      ligne[nom] = champs[i] ?? "";
    });
    return ligne;
  });
}

function decouperLignes(texte: string): string[][] {
  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let dansGuillemets = false;
  const brut = texte.replace(/\r\n/g, "\n");

  for (let i = 0; i < brut.length; i++) {
    const c = brut[i];
    if (dansGuillemets) {
      if (c === '"' && brut[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champ += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === ",") {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ);
      champ = "";
      if (ligne.length > 1 || ligne[0] !== "") lignes.push(ligne);
      ligne = [];
    } else {
      champ += c;
    }
  }
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes;
}
