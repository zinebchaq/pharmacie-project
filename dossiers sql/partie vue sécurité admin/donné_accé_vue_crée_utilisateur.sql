---------------------------------------------------
-- ÉTAPE 5 : DONNER ACCÈS AUX VUES
-- À EXÉCUTER EN TANT QUE SYSTEM
---------------------------------------------------

-- Accès aux vues pour chaque rôle
--Le vendeur accède uniquement à la vue sécurisée
GRANT SELECT ON zineb1.v_produits_vente TO role_vendeur;
GRANT SELECT ON zineb1.v_rapport_financier TO role_comptable;
GRANT SELECT ON zineb1.v_rapport_financier TO role_pharmacien;
GRANT SELECT ON zineb1.v_clients_anonymises TO role_auditeur;
GRANT SELECT ON zineb1.v_commandes_finances TO role_comptable;

-- Créer synonymes publics pour les vues
CREATE PUBLIC SYNONYM v_produits_vente FOR zineb1.v_produits_vente;
CREATE PUBLIC SYNONYM v_rapport_financier FOR zineb1.v_rapport_financier;
CREATE PUBLIC SYNONYM v_clients_anonymises FOR zineb1.v_clients_anonymises;
CREATE PUBLIC SYNONYM v_commandes_finances FOR zineb1.v_commandes_finances;

---------------------------------------------------
-- ÉTAPE 6 : CRÉER LES UTILISATEURS CONCRETS
---------------------------------------------------

-- Créer les utilisateurs avec mots de passe
CREATE USER pharmacien_user IDENTIFIED BY pharmacien
DEFAULT TABLESPACE users
TEMPORARY TABLESPACE temp
QUOTA UNLIMITED ON users;

CREATE USER vendeur_user IDENTIFIED BY vendeur
DEFAULT TABLESPACE users
TEMPORARY TABLESPACE temp
QUOTA UNLIMITED ON users;

CREATE USER comptable_user IDENTIFIED BY comptable
DEFAULT TABLESPACE users
TEMPORARY TABLESPACE temp
QUOTA UNLIMITED ON users;

CREATE USER audit_user IDENTIFIED BY audit
DEFAULT TABLESPACE users
TEMPORARY TABLESPACE temp
QUOTA UNLIMITED ON users;
-- Attribuer les rôles aux utilisateurs
GRANT role_pharmacien TO pharmacien_user;
GRANT role_vendeur TO vendeur_user;
GRANT role_comptable TO comptable_user;
GRANT role_auditeur TO audit_user;

-- Donner le droit de connexion
GRANT CREATE SESSION TO pharmacien_user;
GRANT CREATE SESSION TO vendeur_user;
GRANT CREATE SESSION TO comptable_user;
GRANT CREATE SESSION TO audit_user;

---------------------------------------------------
-- DOCUMENTATION : RÉCAPITULATIF DES RÔLES
--Ce script est un script de documentation et de vérification.
--Il permet de présenter clairement les rôles définis dans le système
--et de vérifier l’existence et l’état des utilisateurs créés dans Oracle.
---------------------------------------------------

SELECT 'PHARMACIEN' AS role, 
       'Administrateur complet - Peut TOUT faire' AS description,
       'Gérer stock, ventes, clients, rapports' AS privileges
FROM DUAL
UNION ALL
SELECT 'VENDEUR', 
       'Créer commandes et consulter produits',
       'SELECT Produit, INSERT/UPDATE Client, INSERT Commande/Paiement'
FROM DUAL
UNION ALL
SELECT 'COMPTABLE', 
       'Consulter rapports financiers uniquement',
       'SELECT tables finances, EXECUTE RevenuTotal'
FROM DUAL
UNION ALL
SELECT 'AUDITEUR', 
       'Lecture seule complète de toutes données',
       'SELECT sur toutes les tables'
FROM DUAL;

-- Afficher les utilisateurs créés
SELECT username, account_status, created
FROM dba_users
WHERE username IN ('PHARMACIEN_USER', 'VENDEUR_USER', 'COMPTABLE_USER', 'AUDIT_USER');