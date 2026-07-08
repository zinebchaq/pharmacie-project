const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Middleware de vérification des permissions
const checkPermission = (action) => {
  return (req, res, next) => {
    const role = req.user.role;
    
    // PHARMACIEN : tous les droits
    if (role === 'PHARMACIEN') {
      return next();
    }
    
    // VENDEUR et COMPTABLE : lecture seule
    if ((role === 'VENDEUR' || role === 'COMPTABLE') && action === 'SELECT') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Permission refusée. Vous n\'avez pas les droits nécessaires.'
    });
  };
};

// Route : Obtenir tous les produits (y compris statut)
router.get('/', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        p.id_produit,
        p.nom,
        p.categorie,
        p.prix_unitaire,
        p.stock,
        p.date_expiration,
        p.statut,
        f.nom as fournisseur_nom,
        f.id_fournisseur,
        CASE 
          WHEN p.statut = 'ARCHIVE' THEN 'archive'
          WHEN p.statut = 'INACTIF' THEN 'inactif'
          WHEN p.stock = 0 THEN 'rupture'
          WHEN p.stock < 10 THEN 'faible'
          WHEN p.date_expiration < SYSDATE THEN 'perime'
          WHEN p.date_expiration < SYSDATE + 30 THEN 'expire_bientot'
          ELSE 'ok'
        END as statut_affichage
       FROM Produit p
       JOIN Fournisseur f ON p.id_fournisseur = f.id_fournisseur
       WHERE p.statut != 'ARCHIVE'
       ORDER BY p.nom`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      produits: result.rows,
      permissions: {
        canCreate: req.user.role === 'PHARMACIEN',
        canUpdate: req.user.role === 'PHARMACIEN',
        canDelete: req.user.role === 'PHARMACIEN',
        canArchive: req.user.role === 'PHARMACIEN'
      }
    });

  } catch (err) {
    console.error('Erreur liste produits:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir un produit par ID
router.get('/:id', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        p.*,
        f.nom as fournisseur_nom
       FROM Produit p
       JOIN Fournisseur f ON p.id_fournisseur = f.id_fournisseur
       WHERE p.id_produit = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    res.json({ success: true, produit: result.rows[0] });

  } catch (err) {
    console.error('Erreur détails produit:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Créer un nouveau produit (PHARMACIEN uniquement)
router.post('/', verifyToken, checkPermission('INSERT'), async (req, res) => {
  const { nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration } = req.body;
  let connection;

  try {
    // Validation
    if (!nom || !categorie || !prix_unitaire || !id_fournisseur) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants'
      });
    }

    connection = await getPool().getConnection();

    const result = await connection.execute(
      `INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration, statut)
       VALUES (:nom, :categorie, :prix, :stock, :fournisseur, TO_DATE(:expiration, 'YYYY-MM-DD'), 'ACTIF')
       RETURNING id_produit INTO :id`,
      {
        nom,
        categorie,
        prix: prix_unitaire,
        stock: stock || 0,
        fournisseur: id_fournisseur,
        expiration: date_expiration,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Produit créé avec succès',
      id_produit: result.outBinds.id[0]
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur création produit:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Mettre à jour un produit (PHARMACIEN uniquement)
router.put('/:id', verifyToken, checkPermission('UPDATE'), async (req, res) => {
  const { nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration, statut } = req.body;
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `UPDATE Produit 
       SET nom = :nom,
           categorie = :categorie,
           prix_unitaire = :prix,
           stock = :stock,
           id_fournisseur = :fournisseur,
           date_expiration = TO_DATE(:expiration, 'YYYY-MM-DD'),
           statut = :statut
       WHERE id_produit = :id`,
      {
        nom,
        categorie,
        prix: prix_unitaire,
        stock,
        fournisseur: id_fournisseur,
        expiration: date_expiration,
        statut: statut || 'ACTIF',
        id: req.params.id
      }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    res.json({ success: true, message: 'Produit mis à jour avec succès' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur mise à jour produit:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Changer le statut d'un produit (PHARMACIEN uniquement)
router.patch('/:id/statut', verifyToken, checkPermission('UPDATE'), async (req, res) => {
  const { statut } = req.body;
  let connection;

  try {
    if (!['ACTIF', 'INACTIF', 'ARCHIVE'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Doit être: ACTIF, INACTIF ou ARCHIVE'
      });
    }

    connection = await getPool().getConnection();

    // Si on archive, utiliser la procédure qui supprime aussi
    if (statut === 'ARCHIVE') {
      await connection.execute(
        `BEGIN Archiver_Produit(:id); END;`,
        { id: req.params.id }
      );
      
      await connection.commit();

      return res.json({
        success: true,
        message: 'Produit archivé et supprimé avec succès'
      });
    }

    // Sinon, simple UPDATE
    const result = await connection.execute(
      `UPDATE Produit SET statut = :statut WHERE id_produit = :id`,
      { statut, id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    res.json({
      success: true,
      message: `Produit ${statut === 'INACTIF' ? 'désactivé' : 'activé'} avec succès`
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur changement statut:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer un produit (PHARMACIEN uniquement)
router.delete('/:id', verifyToken, checkPermission('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Vérifier si le produit existe
    const checkResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Produit WHERE id_produit = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT === 0) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }

    // Supprimer le produit
    await connection.execute(
      `DELETE FROM Produit WHERE id_produit = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur suppression produit:', err);
    
    // Erreur de contrainte (produit utilisé dans commandes)
    if (err.errorNum === 2292) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer ce produit car il est utilisé dans des commandes.'
      });
    }

    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir la liste des fournisseurs (pour le formulaire)
router.get('/fournisseurs/liste', verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT id_fournisseur, nom FROM Fournisseur ORDER BY nom`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, fournisseurs: result.rows });

  } catch (err) {
    console.error('Erreur liste fournisseurs:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir les catégories uniques
router.get('/categories/liste', verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT DISTINCT categorie FROM Produit WHERE categorie IS NOT NULL ORDER BY categorie`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      categories: result.rows.map(r => r.CATEGORIE)
    });

  } catch (err) {
    console.error('Erreur liste catégories:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;