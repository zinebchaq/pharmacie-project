---------------------------1) tester FONCTION DisponibiliteProduit si un produit a assez de stock avant de créer une commande.

SELECT id_produit, nom, stock 
FROM Produit 
WHERE id_produit = 7;
-- Supposons que le stock =118

-- Tester avec 2 unités 
SELECT DisponibiliteProduit(7, 2) AS resultat FROM DUAL;
-- RÉSULTAT ATTENDU : 1 (TRUE)

-- ====================
-- TEST 1B : Stock insuffisant
-- ====================
-- Tester avec 500 unités (plus que 150)
SELECT DisponibiliteProduit(7, 500) AS resultat FROM DUAL;
-- RÉSULTAT ATTENDU : 0 (FALSE)

-- ====================
-- TEST 1C : Produit inexistant
-- ====================
SELECT DisponibiliteProduit(9999, 1) AS resultat FROM DUAL;



----------------------------2) function revenu total

SELECT 
    id_commande, 
    id_client, 
    TO_CHAR(date_commande, 'DD/MM/YYYY') AS date_commande,
    statut, 
    montant_total
FROM Commande
where statut = 'terminee'
ORDER BY id_commande;



// le mois et année actuelle 
SELECT zineb1.RevenuTotal(
    EXTRACT(MONTH FROM SYSDATE),  -- Mois actuel
    EXTRACT(YEAR FROM SYSDATE)     -- Année actuelle
) AS revenu_mois_actuel 
FROM DUAL;

//le mois 12 année 2025
SELECT zineb1.RevenuTotal(12, 2025) AS revenu_futur 
FROM DUAL;