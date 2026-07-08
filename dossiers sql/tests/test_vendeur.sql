---------------------------------------------------
-- TEST 1 : VENDEUR_USER
-- À exécuter après connexion en vendeur_user
---------------------------------------------------

-- ✅ DEVRAIT MARCHER
SELECT * FROM Produit;                    -- Consultation produits
SELECT * FROM v_produits_vente;           -- Vue produits
SELECT * FROM Client;                     -- Consultation clients
INSERT INTO Client (nom, prenom, email)   -- Ajout client
VALUES ('Nouveau', 'Client', 'test@vendeur.com');

-- Vérifier disponibilité produit
SELECT id_produit, nom, stock 
FROM Produit 
WHERE id_produit = 7;
-- Supposons que le stock = 150

-- Tester avec 2 unités (moins que 150)
SELECT DisponibiliteProduit(7, 2) AS resultat FROM DUAL;
--  RÉSULTAT ATTENDU : 1 (TRUE)

-- ====================
-- TEST 1B : Stock insuffisant
-- ====================
-- Tester avec 500 unités (plus que 150)
SELECT DisponibiliteProduit(7, 500) AS resultat FROM DUAL;


-- Ajouter/modifier clients
INSERT INTO Client (nom, prenom, email) VALUES ('chaqchaq', 'houda', 'houda@mail.com');
UPDATE Client SET telephone = '0612345678' WHERE id_client = 5;

-- Créer commandes
INSERT INTO Commande (id_client, statut, montant_total) VALUES (1, 'en_cours', 150);
INSERT INTO Commande_Detail (id_commande, id_produit, quantite, prix) VALUES (10, 3, 2, 18);

-- Enregistrer paiement
INSERT INTO Paiement (id_commande, montant, mode_paiement) VALUES (10, 150, 'carte');

-- Utiliser procédures
EXEC CreerCommande(1, SYS.ODCINUMBERLIST(3,4), SYS.ODCINUMBERLIST(2,1));

-- ❌ DEVRAIT ÉCHOUER (pas de droits)
DELETE FROM Produit WHERE id_produit = 1;
DELETE FROM Client WHERE id_client = 1;  
DELETE FROM Commande WHERE id_commande = 1;

-- interdit de modifier commandes existantes et produits 
UPDATE Produit SET prix_unitaire = 100 WHERE id_produit = 2;
UPDATE Commande SET statut = 'terminee' WHERE id_commande = 1;



-- interdit Accéder aux archives
SELECT * FROM Commande_Archive;  -- INTERDIT
SELECT * FROM Alerte_Stock;    

