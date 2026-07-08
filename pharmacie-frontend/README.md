Télécharge et installe Oracle Database Express Edition (XE) (la version 21c ou 19c selon ce que tu utilisais à l'ENSA).

Pendant l'installation, il va te demander un mot de passe pour l'utilisateur SYS / SYSTEM.

Une fois installé, tu devras recréer ton utilisateur zineb1 et réexécuter tes scripts SQL (que je vois dans ton dossier dossiers sql à gauche !) pour recréer les tables de la pharmacie et les déclencheurs (triggers).


⚙️ Installation des dépendances (À faire la première fois)
Terminal 1 : Configurer le Backend
  cd pharmacie-backend
  npm install

Terminal 2 : Configurer le Frontend
  cd pharmacie-frontend
  npm install


Terminal 1 : Lancer le Backend
    cd pharmacie-backend
    npm start    
Terminal 2 : Lancer le Frontend
    cd pharmacie-frontend
    npm run dev