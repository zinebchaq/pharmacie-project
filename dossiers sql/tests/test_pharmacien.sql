
---------------------------------------------------
-- TEST 4 : PHARMACIEN_USER
-- À exécuter après connexion en pharmacien_user
---------------------------------------------------

-- ✅ DEVRAIT TOUT MARCHER (administrateur)
SELECT * FROM Produit;
SELECT * FROM Client;
SELECT * FROM Commande;

-- Modifier produit
UPDATE Produit SET stock = stock + 10 WHERE id_produit = 3;
COMMIT;

-- modifier client
UPDATE client SET nom = 'zineb_modif' WHERE id_client = 61;

UPDATE commande SET montant_total = 140 WHERE id_commande = 22;

