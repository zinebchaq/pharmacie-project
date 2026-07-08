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
    
    // VENDEUR : peut créer et lire
    if (role === 'VENDEUR' && (action === 'INSERT' || action === 'SELECT')) {
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

// Route : Obtenir toutes les commandes
router.get('/', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        c.id_commande,
        c.date_commande,
        c.statut,
        c.montant_total,
        cl.nom || ' ' || cl.prenom as client_nom,
        cl.id_client,
        COUNT(cd.id_produit) as nb_produits
       FROM Commande c
       JOIN Client cl ON c.id_client = cl.id_client
       LEFT JOIN Commande_Detail cd ON c.id_commande = cd.id_commande
       GROUP BY c.id_commande, c.date_commande, c.statut, c.montant_total, 
                cl.nom, cl.prenom, cl.id_client
       ORDER BY c.date_commande DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      commandes: result.rows,
      permissions: {
        canCreate: req.user.role === 'PHARMACIEN' || req.user.role === 'VENDEUR',
        canUpdate: req.user.role === 'PHARMACIEN',
        canDelete: req.user.role === 'PHARMACIEN',
        canChangeStatus: req.user.role === 'PHARMACIEN'
      }
    });

  } catch (err) {
    console.error('Erreur liste commandes:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir les détails d'une commande
router.get('/:id', verifyToken, checkPermission('SELECT'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Infos commande
    const commandeResult = await connection.execute(
      `SELECT 
        c.*,
        cl.nom || ' ' || cl.prenom as client_nom,
        cl.email,
        cl.telephone
       FROM Commande c
       JOIN Client cl ON c.id_client = cl.id_client
       WHERE c.id_commande = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (commandeResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }

    // Détails produits
    const detailsResult = await connection.execute(
      `SELECT 
        cd.id_produit,
        cd.quantite,
        cd.prix,
        p.nom as produit_nom,
        p.categorie
       FROM Commande_Detail cd
       JOIN Produit p ON cd.id_produit = p.id_produit
       WHERE cd.id_commande = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Paiements
    const paiementsResult = await connection.execute(
      `SELECT * FROM Paiement WHERE id_commande = :id ORDER BY date_paiement DESC`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      commande: commandeResult.rows[0],
      details: detailsResult.rows,
      paiements: paiementsResult.rows
    });

  } catch (err) {
    console.error('Erreur détails commande:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Créer une nouvelle commande (PHARMACIEN et VENDEUR)
router.post('/', verifyToken, checkPermission('INSERT'), async (req, res) => {
  const { id_client, produits } = req.body;
  // produits = [{id_produit, quantite, prix}]
  
  let connection;

  try {
    if (!id_client || !produits || produits.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Client et produits requis'
      });
    }

    connection = await getPool().getConnection();

    // Vérifier disponibilité des produits
    for (const prod of produits) {
      const stockResult = await connection.execute(
        `SELECT stock FROM Produit WHERE id_produit = :id`,
        { id: prod.id_produit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (stockResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Produit ${prod.id_produit} introuvable`
        });
      }

      if (stockResult.rows[0].STOCK < prod.quantite) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour le produit ${prod.id_produit}`
        });
      }
    }

    // Créer la commande
    const commandeResult = await connection.execute(
      `INSERT INTO Commande (id_client, date_commande, statut, montant_total)
       VALUES (:client, SYSDATE, 'en_cours', 0)
       RETURNING id_commande INTO :id`,
      {
        client: id_client,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }
    );

    const commandeId = commandeResult.outBinds.id[0];
    let montantTotal = 0;

    // Ajouter les détails et mettre à jour le stock
    for (const prod of produits) {
      await connection.execute(
        `INSERT INTO Commande_Detail (id_commande, id_produit, quantite, prix)
         VALUES (:commande, :produit, :qte, :prix)`,
        {
          commande: commandeId,
          produit: prod.id_produit,
          qte: prod.quantite,
          prix: prod.prix
        }
      );

      // Le trigger trg_update_stock_complet met à jour le stock automatiquement
      montantTotal += prod.prix * prod.quantite;
    }

    // Mettre à jour le montant total
    await connection.execute(
      `UPDATE Commande SET montant_total = :total WHERE id_commande = :id`,
      { total: montantTotal, id: commandeId }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Commande créée avec succès',
      id_commande: commandeId
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur création commande:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Modifier le statut d'une commande (PHARMACIEN uniquement)
router.put('/:id/statut', verifyToken, checkPermission('UPDATE'), async (req, res) => {
  const { statut } = req.body;
  let connection;

  try {
    if (!['en_cours', 'terminee', 'annulee'].includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    connection = await getPool().getConnection();

    const result = await connection.execute(
      `UPDATE Commande SET statut = :statut WHERE id_commande = :id`,
      { statut, id: req.params.id }
    );

    await connection.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }

    res.json({
      success: true,
      message: `Commande ${statut === 'terminee' ? 'terminée' : 'mise à jour'} avec succès`
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur mise à jour statut:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Annuler une commande (PHARMACIEN uniquement)
router.delete('/:id', verifyToken, checkPermission('DELETE'), async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    // Vérifier que la commande existe
    const checkResult = await connection.execute(
      `SELECT statut FROM Commande WHERE id_commande = :id`,
      { id: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }

    // Ne pas supprimer, mais annuler
    await connection.execute(
      `UPDATE Commande SET statut = 'annulee' WHERE id_commande = :id`,
      { id: req.params.id }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Commande annulée avec succès'
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur annulation commande:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Obtenir la liste des clients (pour le formulaire)
router.get('/clients/liste', verifyToken, async (req, res) => {
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT id_client, nom, prenom, email, telephone 
       FROM Client 
       ORDER BY nom, prenom`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, clients: result.rows });

  } catch (err) {
    console.error('Erreur liste clients:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Route : Rechercher des produits (pour le formulaire)
router.get('/produits/recherche', verifyToken, async (req, res) => {
  const { q } = req.query;
  let connection;

  try {
    connection = await getPool().getConnection();

    const result = await connection.execute(
      `SELECT 
        id_produit,
        nom,
        categorie,
        prix_unitaire,
        stock
       FROM Produit
       WHERE stock > 0
       AND (LOWER(nom) LIKE LOWER(:search) OR LOWER(categorie) LIKE LOWER(:search))
       ORDER BY nom
       FETCH FIRST 20 ROWS ONLY`,
      { search: `%${q || ''}%` },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({ success: true, produits: result.rows });

  } catch (err) {
    console.error('Erreur recherche produits:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;