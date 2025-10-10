-- Script pour vider complètement la base de données-- Script SQL pour vider toutes les tables de données

-- Supprime toutes les données dans l'ordre correct pour respecter les contraintes-- Garde la structure mais supprime le contenu



-- Supprimer les données des tables liées-- Désactiver les contraintes de clés étrangères temporairement

DELETE FROM "carte_raretes";SET session_replication_role = replica;

DELETE FROM "cartes";

DELETE FROM "raretes";-- Vider les tables dans l'ordre (des dépendantes vers les principales)

DELETE FROM "series";TRUNCATE TABLE carte_raretes CASCADE;

TRUNCATE TABLE cartes CASCADE;

-- Réinitialiser les séquences auto-incrementTRUNCATE TABLE raretes CASCADE;

ALTER SEQUENCE "series_id_seq" RESTART WITH 1;TRUNCATE TABLE series CASCADE;

ALTER SEQUENCE "cartes_id_seq" RESTART WITH 1;

ALTER SEQUENCE "raretes_id_seq" RESTART WITH 1;-- Réactiver les contraintes de clés étrangères

ALTER SEQUENCE "carte_raretes_id_seq" RESTART WITH 1;SET session_replication_role = DEFAULT;



-- Afficher le statut final-- Optionnel : Réinitialiser les séquences d'auto-increment

SELECT 'Base de données vidée avec succès' as status;ALTER SEQUENCE series_id_seq RESTART WITH 1;
ALTER SEQUENCE cartes_id_seq RESTART WITH 1;
ALTER SEQUENCE raretes_id_seq RESTART WITH 1;
ALTER SEQUENCE carte_raretes_id_seq RESTART WITH 1;