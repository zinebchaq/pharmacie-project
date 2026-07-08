const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { getPool } = require('../config/database');
const { verifyToken } = require('./auth');

// Middleware de vérification des permissions STRICTES
const checkPharmacienOnly = (req, res, next) => {
  const role = req.user.role;
  
  // SEUL LE PHARMACIEN peut accéder à cette page
  if (role !== 'PHARMACIEN') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Seul le Pharmacien peut gérer les fournisseurs.'
    });
  }
  
  next();
};

// Route : Obtenir tous les fournisseurs (PHARMACIEN uniquement pour CRUD)
router.get('/', verifyToken, checkPharmacienOnly, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        f.id_fournisseur,
        f.nom,
        f.contact,
        f.adresse,
        COUNT(p.id_produit) as nb_produits
       FROM Fournisseur f
       LEFT JOIN Produit p ON f.id_fournisseur = p.id_fournisseur
       GROUP BY f.id_fournisseur, f.nom, f.contact, f.adresse
       ORDER BY f.nom`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      fournisseurs: result.rows,
      permissions: {
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canView: true
      }
    });

  } catch (err) {
    console.error('Erreur liste fournisseurs:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir un fournisseur par ID
router.get('/:id', verifyToken, checkPharmacienOnly, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT * FROM Fournisseur WHERE id_fournisseur = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
    }

    // Récupérer les produits associés
    const produitsResult = await connection.execute(
      `SELECT id_produit, nom, categorie, prix_unitaire, stock 
       FROM Produit 
       WHERE id_fournisseur = :id 
       ORDER BY nom`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      fournisseur: result.rows[0],
      produits: produitsResult.rows
    });

  } catch (err) {
    console.error('Erreur détails fournisseur:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Créer un nouveau fournisseur (PHARMACIEN uniquement)
router.post('/', verifyToken, checkPharmacienOnly, async (req, res) => {
  const { nom, contact, adresse } = req.body;
  let connection;

  try {
    // Validation
    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du fournisseur est obligatoire'
      });
    }

    connection = await getPool().getConnection();

    // Vérifier si le fournisseur existe déjà
    const checkResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Fournisseur WHERE LOWER(nom) = LOWER(:nom)`,
      { nom },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT > 0) {
      return res.status(400).json({
        success: false,
        message: 'Un fournisseur avec ce nom existe déjà'
      });
    }

    const result = await connection.execute(
      `INSERT INTO Fournisseur (nom, contact, adresse)
       VALUES (:nom, :contact, :adresse)
       RETURNING id_fournisseur INTO :id`,
      {
        nom,
        contact: contact || null,
        adresse: adresse || null,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Fournisseur créé avec succès',
      id_fournisseur: result.outBinds.id[0]
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur création fournisseur:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Mettre à jour un fournisseur (PHARMACIEN uniquement)
router.put('/:id', verifyToken, checkPharmacienOnly, async (req, res) => {
  const { nom, contact, adresse } = req.body;
  let connection;

  try {
    if (!nom) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du fournisseur est obligatoire'
      });
    }

    connection = await getPool().getConnection();

    const result = await connection.execute(
      `UPDATE Fournisseur 
       SET nom = :nom,
           contact = :contact,
           adresse = :adresse
       WHERE id_fournisseur = :id`,
      {
        nom,
        contact: contact || null,
        adresse: adresse || null,
        id: req.params.id
      }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
    }

    res.json({ success: true, message: 'Fournisseur mis à jour avec succès' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur mise à jour fournisseur:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Supprimer un fournisseur (PHARMACIEN uniquement)
router.delete('/:id', verifyToken, checkPharmacienOnly, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Vérifier si le fournisseur a des produits associés
    const checkResult = await connection.execute(
      `SELECT COUNT(*) as count FROM Produit WHERE id_fournisseur = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows[0].COUNT > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer ce fournisseur car il a ${checkResult.rows[0].COUNT} produit(s) associé(s). Veuillez d'abord supprimer ou réassigner les produits.`
      });
    }

    const result = await connection.execute(
      `DELETE FROM Fournisseur WHERE id_fournisseur = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Fournisseur introuvable' });
    }

    res.json({
      success: true,
      message: 'Fournisseur supprimé avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur suppression fournisseur:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;