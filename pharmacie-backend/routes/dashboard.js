const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Route : Statistiques selon le rôle
router.get('/stats', verifyToken, async (req, res) => {
  const userRole = req.user.role;
  let connection;

  try {
    connection = await getPool().getConnection();
    let stats = {};

    // Stats communes à tous les rôles
    const produitsResult = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as disponibles,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as rupture,
        SUM(CASE WHEN date_expiration < SYSDATE THEN 1 ELSE 0 END) as perimes
       FROM Produit`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    stats.produits = produitsResult.rows[0];

    // Stats commandes
    const commandesResult = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) as en_cours,
        SUM(CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END) as terminees,
        SUM(CASE WHEN statut = 'annulee' THEN 1 ELSE 0 END) as annulees
       FROM Commande`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    stats.commandes = commandesResult.rows[0];

    // Stats selon le rôle
    if (userRole === 'PHARMACIEN' || userRole === 'VENDEUR') {
      // Stats clients
      const clientsResult = await connection.execute(
        `SELECT COUNT(*) as total FROM Client`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      stats.clients = clientsResult.rows[0];

      // Commandes du jour
      const commandesJourResult = await connection.execute(
        `SELECT COUNT(*) as count FROM Commande WHERE TRUNC(date_commande) = TRUNC(SYSDATE)`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      stats.commandesJour = commandesJourResult.rows[0].COUNT;
    }

    if (userRole === 'PHARMACIEN') {
      // Alertes stock - Compter directement les produits avec stock faible
      const alertesResult = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM Produit 
         WHERE stock <= 10 
         AND nom IS NOT NULL`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      stats.alertesStock = alertesResult.rows[0].COUNT;
    }

    res.json({ success: true, stats });

  } catch (err) {
    console.error('Erreur stats dashboard:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Produits récents / en alerte
router.get('/produits-alerte', verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT id_produit, nom, categorie, stock, date_expiration, prix_unitaire
       FROM Produit
       WHERE stock < 10 OR date_expiration < SYSDATE + 30
       ORDER BY stock ASC, date_expiration ASC
       FETCH FIRST 10 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, produits: result.rows });

  } catch (err) {
    console.error('Erreur produits alerte:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Commandes récentes
router.get('/commandes-recentes', verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        c.id_commande,
        c.date_commande,
        c.statut,
        c.montant_total,
        cl.nom || ' ' || cl.prenom as client_nom
       FROM Commande c
       JOIN Client cl ON c.id_client = cl.id_client
       ORDER BY c.date_commande DESC
       FETCH FIRST 10 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, commandes: result.rows });

  } catch (err) {
    console.error('Erreur commandes récentes:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Produits les plus vendus
router.get('/produits-populaires', verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        p.nom,
        p.categorie,
        SUM(cd.quantite) as total_vendu
       FROM Commande_Detail cd
       JOIN Produit p ON cd.id_produit = p.id_produit
       GROUP BY p.nom, p.categorie
       ORDER BY total_vendu DESC
       FETCH FIRST 10 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, produits: result.rows });

  } catch (err) {
    console.error('Erreur produits populaires:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;