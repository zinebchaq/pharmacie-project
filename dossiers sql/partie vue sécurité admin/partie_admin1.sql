---------------------------------------------------
-- PARTIE ADMINISTRATION DE LA BASE DE DONNÉES
-- Gestion des utilisateurs, rôles et sécurité
-- À EXÉCUTER EN TANT QUE SYSTEM
---------------------------------------------------

---------------------------------------------------
-- ÉTAPE 1 : CRÉER LES RÔLES
---------------------------------------------------

-- Rôle 1 : Pharmacien (administrateur complet)
CREATE ROLE role_pharmacien;

-- Rôle 2 : Vendeur (ventes et commandes)
CREATE ROLE role_vendeur;

-- Rôle 3 : Comptable (rapports financiers)
CREATE ROLE role_comptable;

-- Rôle 4 : Auditeur (lecture seule)
CREATE ROLE role_auditeur;

---------------------------------------------------
-- ÉTAPE 2 : ATTRIBUER LES PRIVILÈGES PAR RÔLE
---------------------------------------------------
--Donne à l'utilisateur zineb1 le droit de créer des vues.
GRANT CREATE VIEW TO zineb1; 
GRANT SELECT ON zineb1.Produit TO zineb1;
GRANT SELECT ON zineb1.Commande TO zineb1;
GRANT SELECT ON zineb1.Client TO zineb1;
GRANT SELECT ON zineb1.Commande_Detail TO zineb1;
GRANT CREATE JOB TO zineb1;
-- ============================================
-- RÔLE PHARMACIEN : Accès administrateur complet
-- ============================================

-- Tables principales - Accès total
GRANT ALL PRIVILEGES ON zineb1.Fournisseur TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Produit TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Client TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Commande TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Commande_Detail TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Paiement TO role_pharmacien;

-- Tables d'alertes et archives
GRANT ALL PRIVILEGES ON zineb1.Alerte_Stock TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Produit_Archive TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Client_Archive TO role_pharmacien;
GRANT ALL PRIVILEGES ON zineb1.Commande_Archive TO role_pharmacien;

-- Procédures et fonctions - Exécution totale
GRANT EXECUTE ON zineb1.CreerCommande TO role_pharmacien;
GRANT EXECUTE ON zineb1.AlerteStock TO role_pharmacien;
GRANT EXECUTE ON zineb1.Archive_Clients_Inactifs TO role_pharmacien;
GRANT EXECUTE ON zineb1.DisponibiliteProduit TO role_pharmacien;
GRANT EXECUTE ON zineb1.RevenuTotal TO role_pharmacien;

-- ============================================
-- RÔLE VENDEUR : Créer commandes et consulter produits
-- ============================================

-- Consultation des produits et fournisseurs
GRANT SELECT ON zineb1.Produit TO role_vendeur;
GRANT SELECT ON zineb1.Fournisseur TO role_vendeur;

-- Gestion des clients (lecture, ajout, modification)
GRANT SELECT, INSERT, UPDATE ON zineb1.Client TO role_vendeur;

-- Gestion des commandes (lecture, création)
GRANT SELECT, INSERT ON zineb1.Commande TO role_vendeur;
GRANT SELECT, INSERT ON zineb1.Commande_Detail TO role_vendeur;

-- Gestion des paiements (lecture, création)
GRANT SELECT, INSERT ON zineb1.Paiement TO role_vendeur;

-- Procédures autorisées
GRANT EXECUTE ON zineb1.CreerCommande TO role_vendeur;
GRANT EXECUTE ON zineb1.DisponibiliteProduit TO role_vendeur;

-- ============================================
-- RÔLE COMPTABLE : Consultation rapports financiers
-- ============================================

-- Lecture seule des tables principales
GRANT SELECT ON zineb1.Produit TO role_comptable;
GRANT SELECT ON zineb1.Client TO role_comptable;
GRANT SELECT ON zineb1.Commande TO role_comptable;
GRANT SELECT ON zineb1.Commande_Detail TO role_comptable;
GRANT SELECT ON zineb1.Paiement TO role_comptable;
GRANT SELECT ON zineb1.Fournisseur TO role_comptable;

-- Accès aux archives
GRANT SELECT ON zineb1.Commande_Archive TO role_comptable;

-- Fonction pour calculer les revenus
GRANT EXECUTE ON zineb1.RevenuTotal TO role_comptable;

-- ============================================
-- RÔLE AUDITEUR : Lecture seule totale
-- ============================================

-- Lecture seule de toutes les tables
GRANT SELECT ON zineb1.Fournisseur TO role_auditeur;
GRANT SELECT ON zineb1.Produit TO role_auditeur;
GRANT SELECT ON zineb1.Client TO role_auditeur;
GRANT SELECT ON zineb1.Commande TO role_auditeur;
GRANT SELECT ON zineb1.Commande_Detail TO role_auditeur;
GRANT SELECT ON zineb1.Paiement TO role_auditeur;
GRANT SELECT ON zineb1.Alerte_Stock TO role_auditeur;
GRANT SELECT ON zineb1.Produit_Archive TO role_auditeur;
GRANT SELECT ON zineb1.Client_Archive TO role_auditeur;
GRANT SELECT ON zineb1.Commande_Archive TO role_auditeur;

---------------------------------------------------
-- ÉTAPE 3 : CRÉER DES SYNONYMES PUBLICS
-- (Pour éviter d'écrire zineb1. à chaque fois)
---------------------------------------------------
--SELECT * FROM Produit;              -- Utilise le synonyme
--SELECT * FROM zineb1.Produit;       -- Accès direct
-- Tables principales
CREATE PUBLIC SYNONYM Produit FOR zineb1.Produit;
CREATE PUBLIC SYNONYM Client FOR zineb1.Client;
CREATE PUBLIC SYNONYM Commande FOR zineb1.Commande;
CREATE PUBLIC SYNONYM Commande_Detail FOR zineb1.Commande_Detail;
CREATE PUBLIC SYNONYM Paiement FOR zineb1.Paiement;
CREATE PUBLIC SYNONYM Fournisseur FOR zineb1.Fournisseur;

-- Tables d'archives et alertes
CREATE PUBLIC SYNONYM Produit_Archive FOR zineb1.Produit_Archive;
CREATE PUBLIC SYNONYM Client_Archive FOR zineb1.Client_Archive;
CREATE PUBLIC SYNONYM Commande_Archive FOR zineb1.Commande_Archive;
CREATE PUBLIC SYNONYM Alerte_Stock FOR zineb1.Alerte_Stock;

-- Procédures et fonctions
CREATE PUBLIC SYNONYM CreerCommande FOR zineb1.CreerCommande;
CREATE PUBLIC SYNONYM AlerteStock FOR zineb1.AlerteStock;
CREATE PUBLIC SYNONYM Archive_Clients_Inactifs FOR zineb1.Archive_Clients_Inactifs;
CREATE PUBLIC SYNONYM DisponibiliteProduit FOR zineb1.DisponibiliteProduit;
CREATE PUBLIC SYNONYM RevenuTotal FOR zineb1.RevenuTotal;


-- Donner le rôle PHARMACIEN à pharmacien_user
GRANT role_pharmacien TO pharmacien_user;

-- Activer le rôle par défaut pour l'utilisateur
ALTER USER pharmacien_user DEFAULT ROLE role_pharmacien;
GRANT SELECT, INSERT, UPDATE, DELETE, ALTER ON zineb1.Alerte_Stock TO pharmacien_user;
GRANT EXECUTE ON zineb1.AlerteStock TO pharmacien_user;