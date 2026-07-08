const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Middleware de vérification des permissions
const checkPermission = (action) => {
  return (req, res, next) => {
    const role = req.user.role;
    
    // Lecture : tous les rôles
    if (action === 'READ') {
      return next();
    }
    
    // Création : Pharmacien et Vendeur
    if (action === 'CREATE' && (role === 'PHARMACIEN' || role === 'VENDEUR')) {
      return next();
    }
    
    // Modification et Suppression : Pharmacien uniquement
    if ((action === 'UPDATE' || action === 'DELETE') && role === 'PHARMACIEN') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Accès refusé : Vous n\'avez pas les permissions nécessaires'
    });
  };
};

// Route : Liste de tous les paiements
router.get('/', verifyToken, checkPermission('READ'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        p.id_paiement,
        p.id_commande,
        p.montant,
        p.date_paiement,
        p.mode_paiement,
        c.id_client,
        cl.nom || ' ' || cl.prenom as nom_client
       FROM Paiement p
       LEFT JOIN Commande c ON p.id_commande = c.id_commande
       LEFT JOIN Client cl ON c.id_client = cl.id_client
       ORDER BY p.date_paiement DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      paiements: result.rows,
      permissions: {
        canCreate: req.user.role === 'PHARMACIEN' || req.user.role === 'VENDEUR',
        canUpdate: req.user.role === 'PHARMACIEN',
        canDelete: req.user.role === 'PHARMACIEN'
      }
    });

  } catch (err) {
    console.error('Erreur récupération paiements:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des paiements: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Détails d'un paiement
router.get('/:id', verifyToken, checkPermission('READ'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        p.id_paiement,
        p.id_commande,
        p.montant,
        p.date_paiement,
        p.mode_paiement,
        c.id_client,
        c.montant_total as montant_commande,
        c.statut as statut_commande,
        cl.nom || ' ' || cl.prenom as nom_client
       FROM Paiement p
       LEFT JOIN Commande c ON p.id_commande = c.id_commande
       LEFT JOIN Client cl ON c.id_client = cl.id_client
       WHERE p.id_paiement = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable'
      });
    }

    res.json({
      success: true,
      paiement: result.rows[0]
    });

  } catch (err) {
    console.error('Erreur détails paiement:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du paiement: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Ajouter un paiement (Pharmacien et Vendeur)
// Route : Ajouter un paiement (Pharmacien et Vendeur)
router.post('/', verifyToken, checkPermission('CREATE'), async (req, res) => {
  let connection;
  const { id_commande, montant, mode_paiement } = req.body;

  try {
    console.log('🚀 ROUTE POST APPELÉE !');
    console.log('Body reçu:', req.body);

    // Validation
    if (!id_commande || !montant || !mode_paiement) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    if (montant <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant doit être supérieur à 0'
      });
    }

    const modesValides = ['Espèces', 'Carte', 'Chèque', 'Virement'];
    if (!modesValides.includes(mode_paiement)) {
      return res.status(400).json({
        success: false,
        message: 'Mode de paiement invalide'
      });
    }

    connection = await getPool().getConnection();

    console.log('🔍 Recherche commande ID:', id_commande);

    // Vérifier que la commande existe dans les archives
    const commandeCheck = await connection.execute(
      `SELECT vca.id_commande, vca.montant_total
       FROM V_Commandes_Archivees vca
       WHERE vca.id_commande = :id`,
      { id: id_commande },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('🔎 Résultat recherche:', commandeCheck.rows);

    if (commandeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commande introuvable dans les archives'
      });
    }

    // Vérifier qu'aucun paiement n'existe déjà pour cette commande
    const paiementCheck = await connection.execute(
      `SELECT COUNT(*) as count FROM Paiement WHERE id_commande = :id`,
      { id: id_commande },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (paiementCheck.rows[0].COUNT > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande a déjà été payée'
      });
    }

    // Insérer le paiement
    const result = await connection.execute(
      `INSERT INTO Paiement (id_commande, montant, mode_paiement, date_paiement)
       VALUES (:id_commande, :montant, :mode_paiement, SYSDATE)
       RETURNING id_paiement INTO :id`,
      {
        id_commande,
        montant,
        mode_paiement,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    await connection.commit();

    console.log('✅ Paiement créé avec succès, ID:', result.outBinds.id[0]);

    res.json({
      success: true,
      message: 'Paiement ajouté avec succès',
      id_paiement: result.outBinds.id[0]
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('❌ Erreur ajout paiement:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'ajout du paiement: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Modifier un paiement (Pharmacien uniquement)
router.put('/:id', verifyToken, checkPermission('UPDATE'), async (req, res) => {
  let connection;
  const { montant, mode_paiement } = req.body;

  try {
    // Validation
    if (!montant || !mode_paiement) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    if (montant <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant doit être supérieur à 0'
      });
    }

    const modesValides = ['Espèces', 'Carte', 'Chèque', 'Virement'];
    if (!modesValides.includes(mode_paiement)) {
      return res.status(400).json({
        success: false,
        message: 'Mode de paiement invalide'
      });
    }

    connection = await getPool().getConnection();

    const result = await connection.execute(
      `UPDATE Paiement 
       SET montant = :montant, 
           mode_paiement = :mode_paiement
       WHERE id_paiement = :id`,
      {
        montant,
        mode_paiement,
        id: req.params.id
      }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Paiement modifié avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur modification paiement:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la modification du paiement: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer un paiement (Pharmacien uniquement)
router.delete('/:id', verifyToken, checkPermission('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `DELETE FROM Paiement WHERE id_paiement = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Paiement supprimé avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur suppression paiement:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression du paiement: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Statistiques des paiements
router.get('/stats/resume', verifyToken, checkPermission('READ'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        COUNT(*) as total_paiements,
        NVL(SUM(montant), 0) as montant_total,
        NVL(AVG(montant), 0) as montant_moyen,
        COUNT(DISTINCT mode_paiement) as modes_utilises
       FROM Paiement`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const modesResult = await connection.execute(
      `SELECT 
        mode_paiement,
        COUNT(*) as nombre,
        SUM(montant) as montant
       FROM Paiement
       GROUP BY mode_paiement
       ORDER BY montant DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      stats: result.rows[0],
      parMode: modesResult.rows
    });

  } catch (err) {
    console.error('Erreur stats paiements:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Liste des commandes pour le dropdown (ARCHIVÉES ET NON PAYÉES)
router.get('/commandes/liste', verifyToken, checkPermission('READ'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // D'abord vérifier si la vue existe
    const viewCheck = await connection.execute(
      `SELECT COUNT(*) as count FROM USER_VIEWS WHERE VIEW_NAME = 'V_COMMANDES_ARCHIVEES'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Vue existe ?', viewCheck.rows[0]);

    // Test simple sans jointure pour voir si le problème vient de là
    const testSimple = await connection.execute(
      `SELECT id_commande, montant_total, id_client
       FROM V_Commandes_Archivees
       ORDER BY id_commande DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Test simple (toutes commandes archivées):', testSimple.rows);

    // Maintenant la vraie requête
    const result = await connection.execute(
      `SELECT 
        vca.id_commande,
        vca.montant_total,
        vca.id_client,
        'Archivée' as statut,
        NVL(cl.nom || ' ' || cl.prenom, 'Client inconnu') as nom_client
       FROM V_Commandes_Archivees vca
       LEFT JOIN Client cl ON vca.id_client = cl.id_client
       WHERE NOT EXISTS (
         SELECT 1 FROM Paiement p WHERE p.id_commande = vca.id_commande
       )
       ORDER BY vca.id_commande DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('Nombre de commandes disponibles pour paiement:', result.rows.length);
    console.log('Commandes:', JSON.stringify(result.rows, null, 2));

    res.json({
      success: true,
      commandes: result.rows
    });

  } catch (err) {
    console.error('Erreur liste commandes:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des commandes: ' + err.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;