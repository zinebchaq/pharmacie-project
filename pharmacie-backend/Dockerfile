# L'environnement de base : un Linux avec Node.js 18 déjà installé
FROM node:18-slim

# Définir le dossier de travail dans le conteneur
# Toutes les commandes suivantes s'exécuteront dans /app
WORKDIR /app

# Copier d'abord package.json et package-lock.json
# On fait ça AVANT le reste du code pour profiter du cache Docker
# Si le code change mais pas package.json → npm install n'est pas refait
COPY package*.json ./

# Installer toutes les dépendances listées dans package.json
# (express, oracledb, bcrypt, jsonwebtoken, dotenv, cors, body-parser)
RUN npm install

# Copier tout le reste du code dans le conteneur
# (app.js, routes/, config/, .env.example, etc.)
COPY . .

# La commande exécutée au démarrage du conteneur
# Équivalent de taper "node app.js" dans le terminal
CMD ["node", "app.js"]