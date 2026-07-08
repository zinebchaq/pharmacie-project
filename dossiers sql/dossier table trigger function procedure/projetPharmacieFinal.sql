
-- TABLES PRINCIPALES


-- Table Fournisseur
CREATE TABLE Fournisseur (
    id_fournisseur NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom            VARCHAR2(100) NOT NULL,
    contact        VARCHAR2(100),
    adresse        VARCHAR2(200)
);


-- Table Produit (avec date d'expiration)
CREATE TABLE Produit (
    id_produit       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom              VARCHAR2(100) NOT NULL,
    categorie        VARCHAR2(100),
    prix_unitaire    NUMBER(10,2) NOT NULL,
    stock            NUMBER DEFAULT 0,
    id_fournisseur   NUMBER NOT NULL,
    date_expiration  DATE,
    CONSTRAINT fk_produit_fournisseur
        FOREIGN KEY (id_fournisseur)
        REFERENCES Fournisseur(id_fournisseur)
);

-- Table Client
CREATE TABLE Client (
    id_client    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom          VARCHAR2(100) NOT NULL,
    prenom       VARCHAR2(100),
    adresse      VARCHAR2(200),
    email        VARCHAR2(150),
    telephone    VARCHAR2(20)
);

-- Table Commande
CREATE TABLE Commande (
    id_commande      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_client        NUMBER NOT NULL,
    date_commande    DATE DEFAULT SYSDATE,
    statut           VARCHAR2(20) CHECK (statut IN ('en_cours','terminee','annulee')),
    montant_total    NUMBER(12,2),
    CONSTRAINT fk_commande_client
        FOREIGN KEY (id_client)
        REFERENCES Client(id_client)
);

-- Table Commande_Detail
CREATE TABLE Commande_Detail (
    id_commande    NUMBER NOT NULL,
    id_produit     NUMBER NOT NULL,
    quantite       NUMBER NOT NULL,
    prix           NUMBER(10,2) NOT NULL,
    CONSTRAINT pk_commande_detail PRIMARY KEY (id_commande, id_produit),
    CONSTRAINT fk_detail_commande
        FOREIGN KEY (id_commande)
        REFERENCES Commande(id_commande),
    CONSTRAINT fk_detail_produit
        FOREIGN KEY (id_produit)
        REFERENCES Produit(id_produit)
);

-- Table Paiement
CREATE TABLE Paiement (
    id_paiement     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_commande     NUMBER NOT NULL,
    montant         NUMBER(12,2),
    date_paiement   DATE DEFAULT SYSDATE,
    mode_paiement   VARCHAR2(50),
    CONSTRAINT fk_paiement_commande
        FOREIGN KEY (id_commande)
        REFERENCES Commande(id_commande)
);

---------------------------------------------------
-- TABLES D'ARCHIVES
---------------------------------------------------

CREATE TABLE Produit_Archive (
    id_produit_archive  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    info_complete       CLOB
);

CREATE TABLE Client_Archive (
    id_client_archive NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    info_complete     CLOB
);

CREATE TABLE Commande_Archive (
    id_commande_archive  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    info_complete        CLOB
);

---------------------------------------------------
-- TABLE ALERTE STOCK
---------------------------------------------------

CREATE TABLE Alerte_Stock (
    id_alerte       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_produit      NUMBER NOT NULL,
    stock_restant   NUMBER NOT NULL,
    date_alerte     DATE DEFAULT SYSDATE,
    message         VARCHAR2(200),
    CONSTRAINT fk_alerte_produit
        FOREIGN KEY (id_produit)
        REFERENCES Produit(id_produit)
);

---------------------------------------------------
-- INSERTIONS DE DONNÉES
---------------------------------------------------

-- Fournisseurs
INSERT INTO Fournisseur (nom, contact, adresse)
VALUES ('DistribPharma', 'contact@distribpharma.com', '12 Rue des Pharmacies, Casablanca');

INSERT INTO Fournisseur (nom, contact, adresse)
VALUES ('MedicoPlus', 'support@medicoplus.com', '45 Avenue Hassan II, Rabat');

INSERT INTO Fournisseur (nom, contact, adresse)
VALUES ('PharmaLab', 'info@pharmalab.com', '8 Boulevard Mohammed V, Fès');

INSERT INTO Fournisseur (nom, contact, adresse)
VALUES ('VitalCare', 'service@vitalcare.com', '23 Rue de la Santé, Marrakech');

-- Produits avec date d'expiration
INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Doliprane 500mg', 'Antidouleur', 25, 200, 1, TO_DATE('2026-12-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Ibuprofène 400mg', 'Anti-inflammatoire', 32, 150, 1, TO_DATE('2026-11-30','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Vitamine C 1000mg', 'Vitamine', 18, 300, 2, TO_DATE('2027-01-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Amoxicilline 1g', 'Antibiotique', 45, 80, 3, TO_DATE('2025-10-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Paracétamol 1g', 'Antidouleur', 20, 250, 1, TO_DATE('2026-09-30','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Dafalgan 500mg', 'Antalgique', 22, 180, 2, TO_DATE('2026-12-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Aerius 5mg', 'Antihistaminique', 55, 120, 2, TO_DATE('2026-07-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Spasfon Lyoc', 'Antispasmodique', 40, 160, 1, TO_DATE('2026-05-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Gaviscon Menthe', 'Digestif', 30, 140, 3, TO_DATE('2027-03-31','YYYY-MM-DD'));

INSERT INTO Produit (nom, categorie, prix_unitaire, stock, id_fournisseur, date_expiration)
VALUES ('Smecta', 'Anti-diarrhéique', 28, 100, 4, TO_DATE('2026-08-31','YYYY-MM-DD'));

-- Clients
INSERT INTO Client (nom, prenom, adresse, email, telephone)
VALUES ('Benali', 'Samira', '12 Rue Hassan II, Casablanca', 'samira.benali@gmail.com', '0612345678');

INSERT INTO Client (nom, prenom, adresse, email, telephone)
VALUES ('El Fassi', 'Youssef', '45 Avenue Mohammed V, Rabat', 'youssef.fassi@gmail.com', '0623456789');

INSERT INTO Client (nom, prenom, adresse, email, telephone)
VALUES ('Habbassi', 'Amina', '28 Rue Marrakech, Fès', 'amina.habbassi@gmail.com', '0634567890');

INSERT INTO Client (nom, prenom, adresse, email, telephone)
VALUES ('Ouardi', 'Karim', '90 Rue Agdal, Marrakech', 'karim.ouardi@gmail.com', '0645678901');

---------------------------------------------------
-- UPDATES ET DELETES EXISTANTS
---------------------------------------------------

-- Mettre à jour un produit
UPDATE Produit
SET prix_unitaire = 28.00,
    stock = stock + 50,
    categorie = 'Antalgique'
WHERE id_produit = 1;

-- Supprimer un produit
DELETE FROM Produit
WHERE id_produit = 1;

-- Mettre à jour un client
UPDATE Client
SET adresse = 'Nouvelle adresse 123, Casablanca',
    telephone = '0700000000'
WHERE id_client = 1;

-- Supprimer un client
DELETE FROM Client
WHERE id_client = 4;

---------------------------------------------------
-- COMMANDES ET DÉTAILS
---------------------------------------------------

-- Créer commandes
INSERT INTO Commande (id_client, statut, montant_total)
VALUES (1, 'en_cours', 63);

INSERT INTO Commande (id_client, statut, montant_total)
VALUES (3, 'annulee', 45);

INSERT INTO Commande (id_client, statut, montant_total)
VALUES (2, 'en_cours', 150);

INSERT INTO Commande (id_client, statut, montant_total)
VALUES (1, 'en_cours', 120);

-- Commande_Detail
INSERT INTO Commande_Detail (id_commande, id_produit, quantite, prix)
VALUES (1, 3, 1, 18);

INSERT INTO Commande_Detail (id_commande, id_produit, quantite, prix)
VALUES (1, 4, 1, 45);

---------------------------------------------------
-- PAIEMENTS
---------------------------------------------------

INSERT INTO Paiement (id_commande, montant, mode_paiement)
VALUES (1, 30, 'especes');

INSERT INTO Paiement (id_commande, montant, mode_paiement)
VALUES (1, 33, 'carte');

INSERT INTO Paiement (id_commande, montant, mode_paiement)
VALUES (3, 120, 'virement');

---------------------------------------------------
-- PROCÉDURES, TRIGGERS, FONCTIONS
---------------------------------------------------

-- 1)  Fonction Disponibilité produit  bien   
-- si je veux ajouter une commande je ne vais pas pouvoir 
-- ajouter un produit qui est en rupture stock c'est ça

CREATE OR REPLACE FUNCTION DisponibiliteProduit(
    p_id_produit  NUMBER,
    p_quantite    NUMBER
) RETURN NUMBER  -- Changé de BOOLEAN à NUMBER
IS
    v_stock NUMBER;
BEGIN
    SELECT stock INTO v_stock
    FROM Produit
    WHERE id_produit = p_id_produit;

    IF v_stock >= p_quantite THEN
        RETURN 1;  -- TRUE = 1
    ELSE
        RETURN 0;  -- FALSE = 0
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;  -- Produit inexistant = 0
END;
/

--2)  Fonction Revenu Total bien dans dashboard
CREATE OR REPLACE FUNCTION RevenuTotal(
    p_mois   IN NUMBER,
    p_annee  IN NUMBER
) RETURN NUMBER
IS
    v_total NUMBER;
BEGIN
    SELECT NVL(SUM(montant_total), 0)
    INTO v_total
    FROM Commande
    WHERE statut = 'terminee'
      AND EXTRACT(YEAR FROM date_commande) = p_annee
      AND EXTRACT(MONTH FROM date_commande) = p_mois;
    
    RETURN v_total;
END;
/

--3)  Trigger mise à jour stock après commande bien
CREATE OR REPLACE TRIGGER trg_update_stock_complet
AFTER INSERT OR UPDATE ON Commande_Detail
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        UPDATE Produit
        SET stock = stock - :NEW.quantite
        WHERE id_produit = :NEW.id_produit;
    END IF;

    IF UPDATING THEN
        UPDATE Produit
        SET stock = stock + (:OLD.quantite - :NEW.quantite)
        WHERE id_produit = :NEW.id_produit;
    END IF;
END;
/


--se déclenche à chaque fois que le statut passe à terminee on déplace commande dans la table commande archivée

DROP TRIGGER trg_archive_commande;
-- 4)  Créer  TRIGGER trg_archive_commande
-- TRIGGER D'ARCHIVAGE DES COMMANDES TERMINÉES
---------------------------------------------------
-- Objectif : Archiver automatiquement les commandes 
-- lorsque leur statut passe à 'terminee'
-- Stratégie : Utilisation d'un COMPOUND TRIGGER pour 
-- collecter les IDs puis supprimer en fin de transaction
-- IMPORTANT : Gère aussi la suppression des paiements
---------------------------------------------------

CREATE OR REPLACE TRIGGER trg_archive_commande
FOR UPDATE OF statut ON Commande
COMPOUND TRIGGER

    -- Collection pour stocker les IDs des commandes à archiver
    TYPE t_commande_ids IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    v_ids_a_archiver t_commande_ids;
    v_index PLS_INTEGER := 0;

    ---------------------------------------------------
    -- BLOC 1 : COLLECTE DES COMMANDES À ARCHIVER
    ---------------------------------------------------
    -- S'exécute pour chaque ligne mise à jour
    -- Détecte si le statut passe à 'terminee'
    ---------------------------------------------------
    AFTER EACH ROW IS
    BEGIN
        -- Vérifier la transition vers 'terminee'
        -- NVL gère le cas où :OLD.statut est NULL
        IF NVL(:OLD.statut, 'X') != 'terminee' 
           AND :NEW.statut = 'terminee' THEN
            
            -- Ajouter l'ID à la collection
            v_index := v_index + 1;
            v_ids_a_archiver(v_index) := :NEW.id_commande;
            
        END IF;
    END AFTER EACH ROW;

    ---------------------------------------------------
    -- BLOC 2 : ARCHIVAGE ET SUPPRESSION
    ---------------------------------------------------
    -- S'exécute une seule fois après toutes les lignes
    -- Traite toutes les commandes collectées
    ---------------------------------------------------
    AFTER STATEMENT IS
        v_info_complete CLOB;
        v_details_count NUMBER;
        v_paiements_count NUMBER;
    BEGIN
        -- Traiter chaque commande identifiée
        FOR i IN 1..v_ids_a_archiver.COUNT LOOP
            
            -- ===== ÉTAPE 1 : CONSTRUIRE LES INFORMATIONS COMPLÈTES =====
            
            -- Compter les détails et paiements
            SELECT COUNT(*) INTO v_details_count
            FROM Commande_Detail
            WHERE id_commande = v_ids_a_archiver(i);
            
            SELECT COUNT(*) INTO v_paiements_count
            FROM Paiement
            WHERE id_commande = v_ids_a_archiver(i);
            
            -- Construire l'information complète avec tous les détails
            DECLARE
                v_commande_info VARCHAR2(4000);
                v_details_info CLOB;
                v_paiements_info CLOB;
            BEGIN
                -- Informations de base de la commande
                SELECT 
                    'ID_COMMANDE=' || c.id_commande ||
                    ', ID_CLIENT=' || c.id_client ||
                    ', DATE=' || TO_CHAR(c.date_commande, 'YYYY-MM-DD HH24:MI:SS') ||
                    ', STATUT=' || c.statut ||
                    ', MONTANT_TOTAL=' || c.montant_total
                INTO v_commande_info
                FROM Commande c
                WHERE c.id_commande = v_ids_a_archiver(i);
                
                -- Détails des produits
                IF v_details_count > 0 THEN
                    SELECT LISTAGG(
                        'PRODUIT_ID=' || cd.id_produit || 
                        ':QTE=' || cd.quantite || 
                        ':PRIX=' || cd.prix,
                        '; '
                    ) WITHIN GROUP (ORDER BY cd.id_produit)
                    INTO v_details_info
                    FROM Commande_Detail cd
                    WHERE cd.id_commande = v_ids_a_archiver(i);
                ELSE
                    v_details_info := 'Aucun détail';
                END IF;
                
                -- Détails des paiements
                IF v_paiements_count > 0 THEN
                    SELECT LISTAGG(
                        'PAIEMENT_ID=' || p.id_paiement ||
                        ':MONTANT=' || p.montant ||
                        ':DATE=' || TO_CHAR(p.date_paiement, 'YYYY-MM-DD') ||
                        ':MODE=' || p.mode_paiement,
                        '; '
                    ) WITHIN GROUP (ORDER BY p.id_paiement)
                    INTO v_paiements_info
                    FROM Paiement p
                    WHERE p.id_commande = v_ids_a_archiver(i);
                ELSE
                    v_paiements_info := 'Aucun paiement';
                END IF;
                
                -- Assembler tout
                v_info_complete := v_commande_info || 
                                  ', DETAILS=[' || v_details_info || ']' ||
                                  ', PAIEMENTS=[' || v_paiements_info || ']';
            END;
            
            -- ===== ÉTAPE 2 : ARCHIVER =====
            
            INSERT INTO Commande_Archive (info_complete)
            VALUES (v_info_complete);
            
            -- ===== ÉTAPE 3 : SUPPRIMER LES PAIEMENTS (CLÉ ÉTRANGÈRE) =====
            
            DELETE FROM Paiement
            WHERE id_commande = v_ids_a_archiver(i);
            
            -- ===== ÉTAPE 4 : SUPPRIMER LES DÉTAILS (CLÉ ÉTRANGÈRE) =====
            
            DELETE FROM Commande_Detail
            WHERE id_commande = v_ids_a_archiver(i);
            
            -- ===== ÉTAPE 5 : SUPPRIMER LA COMMANDE =====
            
            DELETE FROM Commande
            WHERE id_commande = v_ids_a_archiver(i);
            
        END LOOP;
        
        -- Réinitialiser la collection pour la prochaine transaction
        v_ids_a_archiver.DELETE;
        v_index := 0;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- En cas d'erreur, propager l'exception
            -- Le ROLLBACK sera automatique (pas de COMMIT dans le trigger)
            RAISE_APPLICATION_ERROR(-20100, 
                'Erreur lors de l''archivage de la commande : ' || SQLERRM);
    END AFTER STATEMENT;

END trg_archive_commande;
/


---------------------------------------------------
--8)  CRÉER LE NOUVEAU TRIGGER (MARQUER COMME ARCHIVE)
---------------------------------------------------
drop TRIGGER trg_marquer_produit_perime;




--5)  Trigger protection client  bien quand le client a deja une commande 
CREATE OR REPLACE TRIGGER trg_prevent_client_delete
BEFORE DELETE ON Client
FOR EACH ROW
DECLARE
    nb_active NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO nb_active
    FROM Commande
    WHERE id_client = :OLD.id_client
      AND statut IN ('en_cours', 'terminee');

    IF nb_active > 0 THEN
        RAISE_APPLICATION_ERROR(-20001,
            'Suppression impossible : le client a des commandes actives.');
    END IF;
END;
/

--6)  Procédure archivage clients inactifs bien dans boutton 
CREATE OR REPLACE PROCEDURE Archive_Clients_Inactifs AS
BEGIN
    INSERT INTO Client_Archive (info_complete)
    SELECT
        'ID_CLIENT=' || c.id_client ||
        ', NOM=' || c.nom ||
        ', PRENOM=' || c.prenom ||
        ', EMAIL=' || c.email ||
        ', TELEPHONE=' || c.telephone
    FROM Client c
    WHERE c.id_client NOT IN (
        SELECT id_client FROM Commande
        WHERE date_commande > ADD_MONTHS(SYSDATE, -24)
    );

    DELETE FROM Client
    WHERE id_client NOT IN (
        SELECT id_client FROM Commande
        WHERE date_commande > ADD_MONTHS(SYSDATE, -24)
    );
END;
/

--7)  Procédure création commande bien boutton 
CREATE OR REPLACE PROCEDURE CreerCommande(
    p_id_client       NUMBER,
    p_liste_produits  SYS.ODCINUMBERLIST,
    p_quantites       SYS.ODCINUMBERLIST
)
IS
    v_id_commande     NUMBER;
    v_total           NUMBER := 0;
    v_prix            NUMBER;
BEGIN
    INSERT INTO Commande(id_client, date_commande, statut, montant_total)
    VALUES (p_id_client, SYSDATE, 'en_cours', 0)
    RETURNING id_commande INTO v_id_commande;

    FOR i IN 1..p_liste_produits.COUNT LOOP
        IF DisponibiliteProduit(p_liste_produits(i), p_quantites(i)) = 0 THEN
            RAISE_APPLICATION_ERROR(-20020, 'Stock insuffisant pour le produit ' || p_liste_produits(i));
        END IF;

        SELECT prix_unitaire INTO v_prix
        FROM Produit
        WHERE id_produit = p_liste_produits(i);

        INSERT INTO Commande_Detail(id_commande, id_produit, quantite, prix)
        VALUES (v_id_commande, p_liste_produits(i), p_quantites(i), v_prix);

        v_total := v_total + (v_prix * p_quantites(i));
    END LOOP;

    UPDATE Commande
    SET montant_total = v_total
    WHERE id_commande = v_id_commande;

    COMMIT;
END;
/

--8) trigger de produit_archive dans le fichier sql corriger_trigger_produit_archive


--9)   voir page stock
CREATE OR REPLACE PROCEDURE AlerteStock(p_seuil IN NUMBER)
AS
BEGIN
    -- Supprimer les anciennes alertes pour ce seuil
    DELETE FROM Alerte_Stock 
    WHERE message LIKE '%seuil (' || p_seuil || ')%';
    
    -- Insérer les nouvelles alertes
    INSERT INTO Alerte_Stock (id_produit, stock_restant, message)
    SELECT id_produit, stock, 
           'Stock inférieur au seuil (' || p_seuil || ')'
    FROM Produit
    WHERE stock < p_seuil;
    
    COMMIT;
    
    DBMS_OUTPUT.PUT_LINE('Alerte créée pour les produits avec stock < ' || p_seuil);
END;
/



---------------------------------------------------
-- REQUÊTES RAPPORTS EXEMPLES
---------------------------------------------------

-- Produits disponibles
SELECT id_produit, nom, categorie, prix_unitaire, stock, date_expiration
FROM Produit
WHERE stock > 0
ORDER BY nom;

-- Produits en rupture de stock ou périmés
SELECT id_produit, nom, categorie, prix_unitaire, stock, date_expiration
FROM Produit
WHERE stock = 0 OR date_expiration < SYSDATE
ORDER BY nom;

--historique des client inactif 
select * from client_archive;


-- Produits les plus vendus
SELECT 
    p.categorie,
    p.nom AS produit,
    SUM(cd.quantite) AS total_vendu
FROM Commande_Detail cd
JOIN Produit p ON p.id_produit = cd.id_produit
GROUP BY p.categorie, p.nom
ORDER BY p.categorie, total_vendu DESC;

