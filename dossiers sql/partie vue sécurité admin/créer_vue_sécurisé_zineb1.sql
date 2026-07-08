---------------------------------------------------
-- ÉTAPE 4 : CRÉER DES VUES SÉCURISÉES
-- À EXÉCUTER AVEC VOTRE CONNEXION "ProjetPharmacie"
---------------------------------------------------

-- Vue 1 : Produits pour vendeur (sans info sensible fournisseur)
CREATE OR REPLACE VIEW v_produits_vente AS
SELECT 
    id_produit,
    nom,
    categorie,
    prix_unitaire,
    stock,
    date_expiration
FROM Produit
WHERE stock > 0
ORDER BY nom;

-- Vue 2 : Rapport financier pour comptable
CREATE OR REPLACE VIEW v_rapport_financier AS
SELECT 
    EXTRACT(YEAR FROM c.date_commande) AS annee,
    EXTRACT(MONTH FROM c.date_commande) AS mois,
    COUNT(c.id_commande) AS nb_commandes,
    SUM(c.montant_total) AS revenu_total,
    AVG(c.montant_total) AS panier_moyen
FROM Commande c
WHERE c.statut = 'terminee'
GROUP BY EXTRACT(YEAR FROM c.date_commande), EXTRACT(MONTH FROM c.date_commande)
ORDER BY annee, mois;

-- Vue 3 : Clients anonymisés pour auditeur
CREATE OR REPLACE VIEW v_clients_anonymises AS
SELECT 
    id_client,
    SUBSTR(nom, 1, 1) || '***' AS nom_anonyme,
    SUBSTR(prenom, 1, 1) || '***' AS prenom_anonyme,
    email
FROM Client;

-- Vue 4 : Détails commandes pour comptable (sans info client sensible)
CREATE OR REPLACE VIEW v_commandes_finances AS
SELECT 
    c.id_commande,
    c.date_commande,
    c.montant_total,
    c.statut,
    COUNT(cd.id_produit) AS nb_produits,
    SUM(cd.quantite) AS total_articles
FROM Commande c
LEFT JOIN Commande_Detail cd ON c.id_commande = cd.id_commande
GROUP BY c.id_commande, c.date_commande, c.montant_total, c.statut;



---------------------------------------------------
-- VUE : EXTRAIRE LES DONNÉES DE COMMANDE_ARCHIVE
---------------------------------------------------
-- Cette vue parse le CLOB pour extraire les informations
-- et permet de les utiliser comme une table normale
---------------------------------------------------

DROP VIEW V_Commandes_Archivees;

CREATE OR REPLACE VIEW V_Commandes_Archivees AS
SELECT 
    id_commande_archive,
    -- Extraire ID_COMMANDE et convertir en NUMBER
    TO_NUMBER(
        REGEXP_SUBSTR(info_complete, 'ID_COMMANDE=([0-9]+)', 1, 1, NULL, 1)
    ) AS id_commande,
    
    -- Extraire ID_CLIENT et convertir en NUMBER
    TO_NUMBER(
        REGEXP_SUBSTR(info_complete, 'ID_CLIENT=([0-9]+)', 1, 1, NULL, 1)
    ) AS id_client,
    
    -- Extraire DATE_COMMANDE
    TO_DATE(
        REGEXP_SUBSTR(info_complete, 'DATE=([^,]+)', 1, 1, NULL, 1),
        'YYYY-MM-DD HH24:MI:SS'
    ) AS date_commande,
    
    -- Extraire STATUT (toujours 'terminee')
    TO_CHAR(
        REGEXP_SUBSTR(info_complete, 'STATUT=([^,]+)', 1, 1, NULL, 1)
    ) AS statut,
    
    -- Extraire MONTANT_TOTAL et convertir en NUMBER
    TO_NUMBER(
        REGEXP_SUBSTR(info_complete, 'MONTANT_TOTAL=([0-9.]+)', 1, 1, NULL, 1)
    ) AS montant_total,
    
    -- Conserver le CLOB complet pour référence
    info_complete
FROM Commande_Archive;

---------------------------------------------------
-- VÉRIFICATION
---------------------------------------------------

-- Tester la vue
SELECT 
    id_commande,
    id_client,
    date_commande,
    statut,
    montant_total
FROM V_Commandes_Archivees
ORDER BY id_commande DESC;

---------------------------------------------------
-- TEST : Vérifier les types de données
---------------------------------------------------

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    DATA_LENGTH
FROM USER_TAB_COLUMNS
WHERE TABLE_NAME = 'V_COMMANDES_ARCHIVEES'
ORDER BY COLUMN_ID;

