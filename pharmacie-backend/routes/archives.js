const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Middleware de vérification des permissions
const checkPermission = (action) => {
  return (req, res, next) => {
    const role = req.user.role;
    
    // VENDEUR : aucun accès aux archives
    if (role === 'VENDEUR') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Les vendeurs ne peuvent pas accéder aux archives.'
      });
    }
    
    // PHARMACIEN : tous les droits
    if (role === 'PHARMACIEN') {
      return next();
    }
    
    // COMPTABLE : lecture seule
    if (role === 'COMPTABLE' && action === 'SELECT') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Permission refusée'
    });
  };
};

// Route : Obtenir les statistiques globales des archives
router.get('/stats', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const produitsResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Produit_Archive`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const clientsResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Client_Archive`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const commandesResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Commande_Archive`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      stats: {
        produits: produitsResult.rows[0].COUNT,
        clients: clientsResult.rows[0].COUNT,
        commandes: commandesResult.rows[0].COUNT
      },
      permissions: {
        canArchive: req.user.role === 'PHARMACIEN',
        canDelete: req.user.role === 'PHARMACIEN'
      }
    });

  } catch (err) {
    console.error('Erreur stats archives:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir les produits archivés
router.get('/produits', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        id_produit_archive,
        info_complete
       FROM Produit_Archive
       ORDER BY id_produit_archive DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('📦 Produits bruts récupérés:', result.rows.length);

    // Parser les infos CLOB avec gestion d'erreur
    const produits = [];
    
    for (const row of result.rows) {
      try {
        // Lire le CLOB
        let infoText = '';
        
        if (row.INFO_COMPLETE) {
          if (typeof row.INFO_COMPLETE === 'string') {
            infoText = row.INFO_COMPLETE;
          } else if (row.INFO_COMPLETE.getData) {
            // C'est un CLOB, le lire de manière asynchrone
            infoText = await row.INFO_COMPLETE.getData();
          } else {
            // Essayer de le convertir en string
            infoText = String(row.INFO_COMPLETE);
          }
        }

        console.log('📄 Info text produit:', infoText);

        // Parser le texte
        const info = {};
        const pairs = infoText.split(',').map(p => p.trim());
        
        pairs.forEach(pair => {
          const eqIndex = pair.indexOf('=');
          if (eqIndex > -1) {
            const key = pair.substring(0, eqIndex).trim();
            const value = pair.substring(eqIndex + 1).trim();
            info[key] = value;
          }
        });

        produits.push({
          id: row.ID_PRODUIT_ARCHIVE,
          ...info
        });
        
      } catch (err) {
        console.error('❌ Erreur parsing produit:', err);
        produits.push({
          id: row.ID_PRODUIT_ARCHIVE,
          ERROR: 'Erreur de parsing: ' + err.message
        });
      }
    }

    console.log('✅ Produits parsés:', produits.length);

    res.json({ success: true, produits });

  } catch (err) {
    console.error('❌ Erreur produits archivés:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir les clients archivés
router.get('/clients', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        id_client_archive,
        info_complete
       FROM Client_Archive
       ORDER BY id_client_archive DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('👥 Clients bruts récupérés:', result.rows.length);

    // Parser les infos CLOB
    const clients = [];
    
    for (const row of result.rows) {
      try {
        // Lire le CLOB
        let infoText = '';
        
        if (row.INFO_COMPLETE) {
          if (typeof row.INFO_COMPLETE === 'string') {
            infoText = row.INFO_COMPLETE;
          } else if (row.INFO_COMPLETE.getData) {
            infoText = await row.INFO_COMPLETE.getData();
          } else {
            infoText = String(row.INFO_COMPLETE);
          }
        }

        console.log('📄 Info text client:', infoText);

        const info = {};
        const pairs = infoText.split(',').map(p => p.trim());
        
        pairs.forEach(pair => {
          const eqIndex = pair.indexOf('=');
          if (eqIndex > -1) {
            const key = pair.substring(0, eqIndex).trim();
            const value = pair.substring(eqIndex + 1).trim();
            info[key] = value;
          }
        });

        clients.push({
          id: row.ID_CLIENT_ARCHIVE,
          ...info
        });
        
      } catch (err) {
        console.error('❌ Erreur parsing client:', err);
        clients.push({
          id: row.ID_CLIENT_ARCHIVE,
          ERROR: 'Erreur de parsing: ' + err.message
        });
      }
    }

    console.log('✅ Clients parsés:', clients.length);

    res.json({ success: true, clients });

  } catch (err) {
    console.error('❌ Erreur clients archivés:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir les commandes archivées
router.get('/commandes', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        id_commande_archive,
        info_complete
       FROM Commande_Archive
       ORDER BY id_commande_archive DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('📋 Commandes brutes récupérées:', result.rows.length);

    // Parser les infos CLOB
    const commandes = [];
    
    for (const row of result.rows) {
      try {
        // Lire le CLOB
        let infoText = '';
        
        if (row.INFO_COMPLETE) {
          if (typeof row.INFO_COMPLETE === 'string') {
            infoText = row.INFO_COMPLETE;
          } else if (row.INFO_COMPLETE.getData) {
            infoText = await row.INFO_COMPLETE.getData();
          } else {
            infoText = String(row.INFO_COMPLETE);
          }
        }

        console.log('📄 Info text commande:', infoText);

        const info = {};
        const pairs = infoText.split(',').map(p => p.trim());
        
        pairs.forEach(pair => {
          const eqIndex = pair.indexOf('=');
          if (eqIndex > -1) {
            const key = pair.substring(0, eqIndex).trim();
            const value = pair.substring(eqIndex + 1).trim();
            info[key] = value;
          }
        });

        commandes.push({
          id: row.ID_COMMANDE_ARCHIVE,
          ...info
        });
        
      } catch (err) {
        console.error('❌ Erreur parsing commande:', err);
        commandes.push({
          id: row.ID_COMMANDE_ARCHIVE,
          ERROR: 'Erreur de parsing: ' + err.message
        });
      }
    }

    console.log('✅ Commandes parsées:', commandes.length);

    res.json({ success: true, commandes });

  } catch (err) {
    console.error('❌ Erreur commandes archivées:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Archiver les clients inactifs (PHARMACIEN uniquement)
router.post('/clients/archiver-inactifs', verifyToken, checkPermission('EXECUTE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Appeler la procédure stockée
    await connection.execute(
      `BEGIN Archive_Clients_Inactifs; END;`
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Clients inactifs archivés avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Erreur archivage clients:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer une archive produit (PHARMACIEN uniquement)
router.delete('/produits/:id', verifyToken, checkPermission('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `DELETE FROM Produit_Archive WHERE id_produit_archive = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Archive introuvable' });
    }

    res.json({ success: true, message: 'Archive supprimée avec succès' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Erreur suppression archive produit:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer une archive client (PHARMACIEN uniquement)
router.delete('/clients/:id', verifyToken, checkPermission('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `DELETE FROM Client_Archive WHERE id_client_archive = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Archive introuvable' });
    }

    res.json({ success: true, message: 'Archive supprimée avec succès' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Erreur suppression archive client:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer une archive commande (PHARMACIEN uniquement)
router.delete('/commandes/:id', verifyToken, checkPermission('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `DELETE FROM Commande_Archive WHERE id_commande_archive = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Archive introuvable' });
    }

    res.json({ success: true, message: 'Archive supprimée avec succès' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Erreur suppression archive commande:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;