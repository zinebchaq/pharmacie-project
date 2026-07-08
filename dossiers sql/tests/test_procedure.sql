
----------------- 6) tester la procédure archive_client_inactif

DELETE from client
where id_client = 176;
DELETE from client_archive 
where id_client_archive = 151;
INSERT INTO Client (nom, prenom, adresse, email, telephone)
VALUES ('maataoui', 'chaimae', '12 Rue Hassan II, Casablanca', 'chaimae@gmail.com', '0655555');

-- 1) Vérifier les clients existants avant l'archivage
SELECT id_client, nom, prenom, email, telephone
FROM Client
ORDER BY id_client;

-- Vérifier la table d'archives avant l'exécution
SELECT id_client_archive, info_complete
FROM Client_Archive
ORDER BY id_client_archive;

-- 2) Exécuter la procédure d'archivage
BEGIN
    Archive_Clients_Inactifs;
END;
/

-- 3) Vérifier les clients restants dans la table Client après archivage
SELECT id_client, nom, prenom, email, telephone
FROM Client
ORDER BY id_client;

-- Vérifier le contenu de la table Client_Archive après archivage
SELECT id_client_archive, info_complete
FROM Client_Archive
ORDER BY id_client_archive;

--------------- 7) test procédure créerCommande 


-- Créer commande
SET SERVEROUTPUT ON;  -- Permet d'afficher DBMS_OUTPUT.PUT_LINE

DECLARE
    produits SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST(3, 4); -- IDs des produits à commander
    quantites SYS.ODCINUMBERLIST := SYS.ODCINUMBERLIST(1, 1); -- Quantités correspondantes
    v_id_commande NUMBER;
BEGIN
    -- Appel de la procédure
    CreerCommande(1, produits, quantites);

    -- Récupérer le dernier id_commande créé
    SELECT MAX(id_commande) INTO v_id_commande FROM Commande;

    -- Affichage pour vérification
    DBMS_OUTPUT.PUT_LINE('Commande créée avec succès ! ID = ' || v_id_commande);

    -- Afficher les détails de la commande
    FOR rec IN (
        SELECT id_produit, quantite, prix
        FROM Commande_Detail
        WHERE id_commande = v_id_commande
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(
            'Produit ' || rec.id_produit || 
            ', Quantité ' || rec.quantite || 
            ', Prix ' || rec.prix
        );
    END LOOP;
END;
/
--changer id selon la sorite de script
select * from commande
where id_commande = 88;





------------- 9)   test procedure alerte stock 
SET SERVEROUTPUT ON;

BEGIN
    -- Appel de la procédure avec un seuil de 5
    AlerteStock(5);
    
    -- Affichage des alertes créées
    FOR rec IN (
        SELECT id_produit, stock_restant, message
        FROM ALERTE_STOCK
        ORDER BY id_produit
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(
            'Produit ' || rec.id_produit ||
            ', Stock restant: ' || rec.stock_restant ||
            ', Message: ' || rec.message
        );
    END LOOP;
END;
/

-- Voir tous les produits avec stock faible
SELECT id_produit, nom, stock
FROM ZINEB1.Produit
WHERE stock < 5
ORDER BY stock;




