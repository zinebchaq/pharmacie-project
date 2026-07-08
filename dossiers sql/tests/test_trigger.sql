------------------3)  trigger update_stock_complet

--VOIR LE STOCK ACTUEL DES PRODUITS

SELECT id_produit, nom, categorie, stock, prix_unitaire
FROM Produit
WHERE id_produit IN (2, 3, 4)
ORDER BY id_produit;

-- 1. Créer une nouvelle commande
INSERT INTO Commande (id_client, date_commande, statut, montant_total)
VALUES (2, SYSDATE, 'en_cours', 77);

-- 2. Récupérer l'ID de la commande créée ^pour le modifer dans 3.
SELECT MAX(id_commande) AS derniere_commande FROM Commande;


-- 3. Ajouter un produit à la commande ( une seule unité du produit 3)
INSERT INTO Commande_Detail (id_commande, id_produit, quantite, prix)
VALUES (157, 3, 1, 32);  
COMMIT;

-- 4. ✅ VÉRIFIER : Le stock doit avoir diminué de 1
SELECT id_produit, nom, stock 
FROM Produit 
WHERE id_produit = 3;


--------------------------- 4) trigger de trg_archive_commande

-- Compter les archives AVANT
SELECT COUNT(*) AS nb_archives_avant FROM Commande_Archive;

-- voir les les statuts des commandes
SELECT 
    id_commande,
    id_client,
    TO_CHAR(date_commande, 'DD/MM/YYYY HH24:MI') AS date_commande,
    statut,
    montant_total
FROM Commande
ORDER BY id_commande;

-- 📝 on note une commande avec statut 'en_cours' 

-- Passer le statut à 'terminee' (DÉCLENCHE LE TRIGGER)
UPDATE Commande 
SET statut = 'terminee' 
WHERE id_commande = 8;  -- Remplacer ID
COMMIT;

--  VÉRIFIER 1 : consulter la table archive La commande a été archivée
SELECT 
    id_commande_archive,
    info_complete,
    'Archive créée' AS resultat
FROM Commande_Archive
ORDER BY id_commande_archive DESC
FETCH FIRST 1 ROW ONLY;

--  VÉRIFIER 2 : La commande a été SUPPRIMÉE de Commande
SELECT COUNT(*) AS commande_existe
FROM Commande
WHERE id_commande = 8;

--  0 (la commande n'existe plus dans Commande)

--  Compter les archives APRÈS
SELECT COUNT(*) AS nb_archives_apres FROM Commande_Archive;

select * from commande_archive;


SET SERVEROUTPUT ON;


---------------- 5) trigger protection client 
-- 1) Test suppression client avec commandes actives (ID_CLIENT = 1 a des commandes "en_cours")

INSERT INTO Client (nom, prenom, adresse, email, telephone)
VALUES ('bench', 'simo', '12 Rue Hassan II, Casablanca', 'simo@gmail.com', '0655555');
 
select * from client; 

BEGIN
    DELETE FROM Client
    WHERE id_client = 1;
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Erreur détectée : ' || SQLERRM);
END;
/
-- 2) Test suppression client sans commandes actives (ID_CLIENT = qu'on a ajouté n'a pas de commandes en cours ou terminées)
BEGIN
    DELETE FROM Client
    WHERE id_client = 101 ;
    DBMS_OUTPUT.PUT_LINE('Client supprimé avec succès.');
END;

select * from client; 



---------------- 8) test trigger de produit archive 

SET SERVEROUTPUT ON;

prompt TEST 1 : CRÉER UN PRODUIT PÉRIMÉ

-- Créer un produit déjà périmé
INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('z', 'Test', 10, 50, 1, TO_DATE('2026-02-01', 'YYYY-MM-DD'));

select * from produit_archive;
select * from produit;

--obligatoire de faire un update car trigger ne se déclenche pas snas evenement
UPDATE Produit
SET date_expiration = DATE '2025-12-01'
WHERE nom = 'z';

SELECT COUNT(*) AS produit_archive
FROM Produit_Archive
WHERE info_complete LIKE '%z%';

-- Vérifier que le produit a été supprimé = 0 (ou pas selon les contraintes)
SELECT COUNT(*) AS produit_existe
FROM Produit
WHERE nom = 'z';

select * from produit_archive;

delete from produit_archive
where id_produit_archive =73;

