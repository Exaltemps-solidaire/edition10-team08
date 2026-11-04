// Service api du gabarit : écoute sur PORT (8081 par défaut), journaux sur la sortie standard.
// Lancé directement par Node (suppression des types TypeScript), sans étape de compilation.
import { createServer, type IncomingMessage } from "node:http";
import { router } from "./routes.ts";
import { pool } from "./db/pool.ts";
import { migrer } from "./db/migrate.ts";

const port = Number(process.env.PORT ?? 8081);

function lireCorpsJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let texte = "";
    req.on("data", (chunk) => (texte += chunk));
    req.on("end", () => {
      if (!texte) return resolve(null);
      try {
        resolve(JSON.parse(texte));
      } catch {
        resolve(null);
      }
    });
  });
}

const serveur = createServer(async (req, res) => {
  try {
    const body = req.method === "POST" || req.method === "PATCH" ? await lireCorpsJson(req) : null;
    const membreId = req.headers["x-membre-id"];
    const { statut, corps } = await router(req.method ?? "GET", req.url ?? "/", {
      body,
      membreId: typeof membreId === "string" ? membreId : null,
    });
    if (corps === undefined) {
      res.writeHead(statut).end();
    } else {
      res.writeHead(statut, { "Content-Type": "application/json" }).end(JSON.stringify(corps));
    }
  } catch (err) {
    console.error("api : erreur non gérée sur", req.method, req.url, err);
    res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ erreur: "erreur interne" }));
  }
});

migrer(pool)
  .then(() => {
    serveur.listen(port, () => console.log(`api : à l'écoute sur le port ${port}`));
  })
  .catch((err) => {
    console.error("api : échec de la migration au démarrage :", err);
    process.exit(1);
  });

// Arrêt propre : le conteneur reçoit SIGTERM, on termine les requêtes en cours avant de sortir.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`api : ${signal} reçu, arrêt`);
    serveur.close(() => process.exit(0));
  });
}
