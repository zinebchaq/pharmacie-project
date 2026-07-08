const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Middleware de vérification des permissions
const checkClientAccess = (action) => {
  return (req, res, next) => {
    const role = req.user.role;
    
    // COMPTABLE : aucun accès
    if (role === 'COMPTABLE') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Les comptables ne peuvent pas accéder aux clients.'
      });
    }
    
    // PHARMACIEN : tous les droits
    if (role === 'PHARMACIEN') {
      return next();
    }
    
    // VENDEUR : peut SELECT, INSERT, UPDATE (pas DELETE)
    if (role === 'VENDEUR') {
      if (action === 'SELECT' || action === 'INSERT' || action === 'UPDATE') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Permission refusée. Les vendeurs ne peuvent pas supprimer de clients.'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Permission refusée'
    });
  };
};

// Route : Obtenir tous les clients
router.get('/', verifyToken, checkClientAccess('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        c.id_client,
        c.nom,
        c.prenom,
        c.adresse,
        c.email,
        c.telephone,
        COUNT(DISTINCT cmd.id_commande) as nb_commandes,
        MAX(cmd.date_commande) as derniere_commande,
        CASE 
          WHEN MAX(cmd.date_commande) > ADD_MONTHS(SYSDATE, -6) THEN 'actif'
          ELSE 'inactif'
        END as statut
       FROM Client c
       LEFT JOIN Commande cmd ON c.id_client = cmd.id_client
       GROUP BY c.id_client, c.nom, c.prenom, c.adresse, c.email, c.telephone
       ORDER BY c.nom, c.prenom`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      clients: result.rows,
      permissions: {
        canCreate: req.user.role === 'PHARMACIEN' || req.user.role === 'VENDEUR',
        canUpdate: req.user.role === 'PHARMACIEN' || req.user.role === 'VENDEUR',
        canDelete: req.user.role === 'PHARMACIEN',
        canView: true
      }
    });

  } catch (err) {
    console.error('Erreur liste clients:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir un client par ID
router.get('/:id', verifyToken, checkClientAccess('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT * FROM Client WHERE id_client = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    // Récupérer l'historique des commandes
    const commandesResult = await connection.execute(
      `SELECT 
        id_commande,
        date_commande,
        statut,
        montant_total
       FROM Commande 
       WHERE id_client = :id 
       ORDER BY date_commande DESC`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      client: result.rows[0],
      commandes: commandesResult.rows
    });

  } catch (err) {
    console.error('Erreur détails client:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Créer un nouveau client (PHARMACIEN et VENDEUR)
router.post('/', verifyToken, checkClientAccess('INSERT'), async (req, res) => {
  const { nom, prenom, adresse, email, telephone } = req.body;
  let connection;

  try {
    // Validation
    if (!nom || !prenom || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nom, prénom et email sont obligatoires'
      });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    connection = await getPool().getConnection();

    // Vérifier si l'email existe déjà
    const checkResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Client WHERE LOWER(email) = LOWER(:email)`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT > 0) {
      return res.status(400).json({
        success: false,
        message: 'Un client avec cet email existe déjà'
      });
    }

    const result = await connection.execute(
      `INSERT INTO Client (nom, prenom, adresse, email, telephone)
       VALUES (:nom, :prenom, :adresse, :email, :telephone)
       RETURNING id_client INTO :id`,
      {
        nom: nom.trim(),
        prenom: prenom.trim(),
        adresse: adresse ? adresse.trim() : null,
        email: email.trim().toLowerCase(),
        telephone: telephone ? telephone.trim() : null,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Client créé avec succès',
      id_client: result.outBinds.id[0]
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur création client:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Mettre à jour un client (PHARMACIEN et VENDEUR)
router.put('/:id', verifyToken, checkClientAccess('UPDATE'), async (req, res) => {
  const { nom, prenom, adresse, email, telephone } = req.body;
  let connection;

  try {
    if (!nom || !prenom || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nom, prénom et email sont obligatoires'
      });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    connection = await getPool().getConnection();

    // Vérifier si l'email existe déjà pour un autre client
    const checkResult = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM Client 
       WHERE LOWER(email) = LOWER(:email) AND id_client != :id`,
      { email, id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT > 0) {
      return res.status(400).json({
        success: false,
        message: 'Un autre client avec cet email existe déjà'
      });
    }

    const result = await connection.execute(
      `UPDATE Client 
       SET nom = :nom,
           prenom = :prenom,
           adresse = :adresse,
           email = :email,
           telephone = :telephone
       WHERE id_client = :id`,
      {
        nom: nom.trim(),
        prenom: prenom.trim(),
        adresse: adresse ? adresse.trim() : null,
        email: email.trim().toLowerCase(),
        telephone: telephone ? telephone.trim() : null,
        id: req.params.id
      }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    res.json({ success: true, message: 'Client mis à jour avec succès' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur mise à jour client:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer un client (PHARMACIEN uniquement)
router.delete('/:id', verifyToken, checkClientAccess('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Vérifier si le client a des commandes
    const checkResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Commande WHERE id_client = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT > 0) {
      // Le trigger trg_prevent_client_delete empêchera la suppression
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer ce client car il a ${checkResult.rows[0].COUNT} commande(s). Le client sera archivé automatiquement lors de l'archivage des clients inactifs.`
      });
    }

    const result = await connection.execute(
      `DELETE FROM Client WHERE id_client = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    res.json({
      success: true,
      message: 'Client supprimé avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur suppression client:', err);
    
    // Erreur du trigger
    if (err.errorNum === 20001) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;