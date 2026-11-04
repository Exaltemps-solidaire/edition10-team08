# Déploiement

Suit `docs/guidelines-deploiement.md`, c'est-à-dire la recette du `/CLAUDE.md` à la racine du serveur.

```bash
podman exec postgres.internal psql -U postgres -c 'CREATE DATABASE team08;'   # une seule fois

podman build -t localhost:5000/team08/api:dev ./api
podman build -t localhost:5000/team08/frontend:dev ./frontend
podman push localhost:5000/team08/api:dev
podman push localhost:5000/team08/frontend:dev
podman compose -f podman-compose.yml -p team08 up -d --force-recreate

curl -s localhost:8080/ && curl -s localhost:8081/health
```

Front sur 8080, API sur 8081 (voir `podman-compose.yml`). L'API reçoit le préfixe
`/api/v1/...` sans retrait par la passerelle.
