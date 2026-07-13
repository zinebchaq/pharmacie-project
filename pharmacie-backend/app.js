const express = require('express'); // Framework pour créer le serveur
const cors = require('cors'); // Permet au frontend de communiquer avec le backend
const bodyParser = require('body-parser'); // Lit les données envoyées par le frontend
const database = require('./config/database');// Connexion à la base de données Oracle
const authRoutes = require('./routes/auth');// Routes pour l'authentification

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',  // Autorise toutes les origines (pour le développement)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));  // Autorise le frontend à appeler le backend
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Dans pharmacie-backend/app.js
const dashboardRoutes = require('./routes/dashboard');

// Après les autres routes
app.use('/api/dashboard', dashboardRoutes);

const produitsRoutes = require('./routes/produits');

app.use('/api/produits', produitsRoutes);

const commandesRoutes = require('./routes/commandes');
app.use('/api/commandes', commandesRoutes);

const archivesRoutes = require('./routes/archives');
app.use('/api/archives', archivesRoutes);

const fournisseursRoutes = require('./routes/fournisseurs');
app.use('/api/fournisseurs', fournisseursRoutes);

const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);

const alertesStockRoutes = require('./routes/alertes-stock');
app.use('/api/alertes-stock', alertesStockRoutes);

const paiementsRoutes = require('./routes/paiements');
app.use('/api/paiements', paiementsRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API PharmaCare - Backend fonctionnel ✅' });
});



// Démarrage du serveur
async function startServer() {
  try {
    // Initialiser le pool de connexions Oracle
    await database.initialize();

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
    });

    // Gérer l'arrêt propre du serveur
    process.on('SIGTERM', async () => {
      console.log('SIGTERM reçu, fermeture du serveur...');
      await database.close();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Erreur lors du démarrage du serveur:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;