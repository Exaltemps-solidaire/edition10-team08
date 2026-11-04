# Service api du gabarit : Node exécute le TypeScript directement, sans dépendance ni compilation.
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY src ./src
ENV NODE_ENV=production PORT=8081
EXPOSE 8081
USER node
CMD ["node", "src/server.ts"]
