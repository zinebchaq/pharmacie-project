const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Middleware de vérification : PHARMACIEN uniquement
const checkPharmacien = (req, res, next) => {
  if (req.user.role !== 'PHARMACIEN') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé : Cette fonctionnalité est réservée au Pharmacien'
    });
  }
  next();
};

// Route : Obtenir les alertes stock EN TEMPS RÉEL (PHARMACIEN uniquement)
// Affiche uniquement les produits avec stock faible ACTUELLEMENT
router.get('/', verifyToken, checkPharmacien, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Récupérer directement depuis la table Produit
    // Afficher UNIQUEMENT les produits avec stock <= 10
    const result = await connection.execute(
      `SELECT 
        p.id_produit,
        p.nom as nom_produit,
        p.categorie,
        p.stock as stock_restant,
        p.prix_unitaire,
        p.date_expiration,
        CASE 
          WHEN p.stock = 0 THEN 'Stock en rupture - Réapprovisionnement urgent'
          WHEN p.stock <= 5 THEN 'Stock critique - Attention requise'
          WHEN p.stock <= 10 THEN 'Stock faible - Surveillance recommandée'
          ELSE 'Stock normal'
        END as message
       FROM Produit p
       WHERE p.stock <= 10
       AND p.nom IS NOT NULL
       ORDER BY p.stock ASC, p.nom`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      alertes: result.rows
    });

  } catch (err) {
    console.error('Erreur récupération alertes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des alertes: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir les alertes avec un seuil personnalisé
router.get('/seuil/:seuil', verifyToken, checkPharmacien, async (req, res) => {
  let connection;
  const seuil = parseInt(req.params.seuil);

  // Valider le seuil
  if (isNaN(seuil) || seuil < 1) {
    return res.status(400).json({
      success: false,
      message: 'Seuil invalide : doit être un nombre supérieur à 0'
    });
  }

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        p.id_produit,
        p.nom as nom_produit,
        p.categorie,
        p.stock as stock_restant,
        p.prix_unitaire,
        p.date_expiration,
        CASE 
          WHEN p.stock = 0 THEN 'Stock en rupture - Réapprovisionnement urgent'
          WHEN p.stock <= :seuil / 2 THEN 'Stock critique - Attention requise'
          WHEN p.stock <= :seuil THEN 'Stock faible - Surveillance recommandée'
          ELSE 'Stock normal'
        END as message
       FROM Produit p
       WHERE p.stock <= :seuil
       AND p.nom IS NOT NULL
       ORDER BY p.stock ASC, p.nom`,
      { seuil },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      alertes: result.rows,
      seuil: seuil
    });

  } catch (err) {
    console.error('Erreur récupération alertes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des alertes: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Statistiques des alertes
router.get('/stats', verifyToken, checkPharmacien, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const statsResult = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as rupture,
        SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) as critique,
        SUM(CASE WHEN stock > 5 AND stock <= 10 THEN 1 ELSE 0 END) as faible
       FROM Produit
       WHERE stock <= 10
       AND nom IS NOT NULL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      stats: statsResult.rows[0]
    });

  } catch (err) {
    console.error('Erreur statistiques alertes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Générer/Enregistrer les alertes dans la table Alerte_Stock (optionnel - historique)
router.post('/generer', verifyToken, checkPharmacien, async (req, res) => {
  const { seuil } = req.body;
  let connection;

  try {
    if (!seuil || seuil < 1) {
      return res.status(400).json({
        success: false,
        message: 'Seuil invalide : doit être supérieur à 0'
      });
    }

    connection = await getPool().getConnection();

    // Appeler la procédure stockée AlerteStock
    await connection.execute(
      `BEGIN AlerteStock(:seuil); END;`,
      { seuil: parseInt(seuil) }
    );

    await connection.commit();

    // Compter le nombre d'alertes générées
    const countResult = await connection.execute(
      `SELECT COUNT(*) as nb 
       FROM Alerte_Stock 
       WHERE date_alerte >= SYSDATE - INTERVAL '1' MINUTE`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const nbAlertes = countResult.rows[0].NB;

    res.json({
      success: true,
      message: 'Alertes générées avec succès',
      nbAlertes: nbAlertes,
      seuil: seuil
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur génération alertes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la génération des alertes: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Historique des alertes (depuis la table Alerte_Stock)
router.get('/historique', verifyToken, checkPharmacien, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        a.id_alerte,
        a.id_produit,
        a.stock_restant,
        a.message,
        a.date_alerte,
        NVL(a.statut, 'nouvelle') as statut,
        p.nom as nom_produit,
        p.categorie
       FROM Alerte_Stock a
       LEFT JOIN Produit p ON a.id_produit = p.id_produit
       WHERE p.nom IS NOT NULL
       ORDER BY a.date_alerte DESC
       FETCH FIRST 100 ROWS ONLY`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      historique: result.rows
    });

  } catch (err) {
    console.error('Erreur récupération historique:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de l\'historique: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;