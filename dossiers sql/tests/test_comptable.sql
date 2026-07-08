
---------------------------------------------------
-- TEST 2 : COMPTABLE_USER
-- À exécuter après connexion en comptable_user
---------------------------------------------------

-- ✅ DEVRAIT MARCHER
-- Tout consulter
SELECT * FROM Produit;
SELECT * FROM Client;
SELECT * FROM Commande;
SELECT * FROM Paiement;

-- Utiliser les vues
SELECT * FROM v_commandes_finances;
                  

-- Calculer revenu
SELECT RevenuTotal(12, 2025) AS revenu_decembre FROM DUAL;
-- Faire des analyses
SELECT 
    EXTRACT(YEAR FROM date_commande) AS annee,
    SUM(montant_total) AS total
FROM Commande
WHERE statut = 'terminee'
GROUP BY EXTRACT(YEAR FROM date_commande);



-- ❌ DEVRAIT ÉCHOUER (lecture seule)
INSERT INTO Commande (id_client, statut, montant_total)
VALUES (1, 'en_cours', 100);


UPDATE Produit SET stock = 200 WHERE id_produit = 3;


DELETE FROM Client WHERE id_client = 1;

