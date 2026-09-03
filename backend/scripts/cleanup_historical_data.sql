-- ============================================================
-- CLEANUP HISTÓRICO: Remove propriedades, leilões e vínculos
-- de julho/2026 para trás (auction_date <= 2026-07-31)
--
-- EXECUTAR SOMENTE APÓS BACKUP (use run_cleanup.sh)
-- Roda dentro de uma única transação — qualquer erro
-- faz ROLLBACK automático, sem perda parcial de dados.
-- ============================================================

BEGIN;

-- ============================================================
-- ETAPA 0: Audit pré-remoção (contagens baseline)
-- ============================================================
DO $$
DECLARE
    cnt_auctions         INTEGER;
    cnt_fav_auctions     INTEGER;
    cnt_pah_past         INTEGER;
    cnt_properties       INTEGER;
    cnt_scores           INTEGER;
    cnt_overrides        INTEGER;
    cnt_pah_total        INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt_auctions      FROM auction_events          WHERE auction_date <= '2026-07-31';
    SELECT COUNT(*) INTO cnt_fav_auctions  FROM user_favorite_auctions   WHERE auction_id IN (SELECT id FROM auction_events WHERE auction_date <= '2026-07-31');
    SELECT COUNT(*) INTO cnt_pah_past      FROM property_auction_history WHERE auction_date <= '2026-07-31';
    SELECT COUNT(*) INTO cnt_properties    FROM property_details;
    SELECT COUNT(*) INTO cnt_scores        FROM property_scores;
    SELECT COUNT(*) INTO cnt_overrides     FROM property_user_overrides;
    SELECT COUNT(*) INTO cnt_pah_total     FROM property_auction_history;

    RAISE NOTICE '==========================================================';
    RAISE NOTICE '  AUDIT PRE-REMOCAO (snapshot antes de qualquer DELETE)';
    RAISE NOTICE '==========================================================';
    RAISE NOTICE '  auction_events a remover (date <= 2026-07-31): %',  cnt_auctions;
    RAISE NOTICE '  user_favorite_auctions afetados (cascade):     %',  cnt_fav_auctions;
    RAISE NOTICE '  property_auction_history (date <= 2026-07-31): %',  cnt_pah_past;
    RAISE NOTICE '  property_auction_history (total):              %',  cnt_pah_total;
    RAISE NOTICE '  property_details (total):                      %',  cnt_properties;
    RAISE NOTICE '  property_scores (total):                       %',  cnt_scores;
    RAISE NOTICE '  property_user_overrides (total):               %',  cnt_overrides;
    RAISE NOTICE '==========================================================';
END $$;

-- ============================================================
-- ETAPA 1: Identificar propriedades a remover
--
-- MANTER: qualquer property_details que tenha pelo menos UMA
-- entrada em property_auction_history com auction_date >= 2026-08-01
--
-- REMOVER:
--   - Propriedades com todas as entradas no passado (jul ou anterior)
--   - Propriedades sem nenhuma entrada em property_auction_history
-- ============================================================
CREATE TEMP TABLE _props_to_delete ON COMMIT DROP AS
SELECT
    pd.property_id           AS pid_str,    -- UUID string
    pd.id                    AS pid_int,    -- PK integer
    pd.parcel_id             AS parcel_id   -- para property_scores
FROM property_details pd
WHERE NOT EXISTS (
    SELECT 1
    FROM property_auction_history pah
    WHERE pah.property_id = pd.property_id
      AND pah.auction_date >= '2026-08-01'
);

DO $$
DECLARE cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt FROM _props_to_delete;
    RAISE NOTICE '  Propriedades selecionadas para remocao: %', cnt;
END $$;

-- ============================================================
-- ETAPA 2: Vinculos de lista (client_list_property)
-- FK: property_id → property_details.id  (sem CASCADE explícito)
-- ============================================================
DELETE FROM client_list_property
WHERE property_id IN (SELECT pid_int FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] client_list_property limpo'; END $$;

-- ============================================================
-- ETAPA 3: Notas de clientes (client_notes)
-- FK: property_id → property_details.id  (sem CASCADE explícito)
-- ============================================================
DELETE FROM client_notes
WHERE property_id IN (SELECT pid_int FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] client_notes limpo'; END $$;

-- ============================================================
-- ETAPA 4: Anexos de clientes (client_attachments)
-- FK: property_id → property_details.id  (sem CASCADE explícito)
-- ============================================================
DELETE FROM client_attachments
WHERE property_id IN (SELECT pid_int FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] client_attachments limpo'; END $$;

-- ============================================================
-- ETAPA 5: Historico de leiloes das propriedades removidas
-- (property_auction_history — por property_id string UUID)
-- ============================================================
DELETE FROM property_auction_history
WHERE property_id IN (SELECT pid_str FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] property_auction_history (propriedades removidas) limpo'; END $$;

-- ============================================================
-- ETAPA 6: Historico de disponibilidade (property_availability_history)
-- Sem FK — limpar explicitamente
-- ============================================================
DELETE FROM property_availability_history
WHERE property_id IN (SELECT pid_str FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] property_availability_history limpo'; END $$;

-- ============================================================
-- ETAPA 7: Scores das propriedades removidas (property_scores)
-- Sem FK — indexada por parcel_id
-- ============================================================
DELETE FROM property_scores
WHERE parcel_id IN (
    SELECT parcel_id
    FROM _props_to_delete
    WHERE parcel_id IS NOT NULL
);

DO $$ BEGIN RAISE NOTICE '  [OK] property_scores limpo'; END $$;

-- ============================================================
-- ETAPA 8: Overrides de usuario (property_user_overrides)
-- FK: property_id → property_details.property_id (CASCADE)
-- Feito explicitamente antes do DELETE de property_details
-- para garantir ordem segura.
-- ============================================================
DELETE FROM property_user_overrides
WHERE property_id IN (SELECT pid_str FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] property_user_overrides limpo'; END $$;

-- ============================================================
-- ETAPA 9: Deletar property_details
-- ============================================================
DELETE FROM property_details
WHERE id IN (SELECT pid_int FROM _props_to_delete);

DO $$ BEGIN RAISE NOTICE '  [OK] property_details removido'; END $$;

-- ============================================================
-- ETAPA 10: Deletar auction_events antigos
--
-- CASCADE automático:
--   → user_favorite_auctions (ondelete=CASCADE)
--   → property_auction_history.auction_id → SET NULL
--     (para entradas de propriedades FUTURAS que apareciam
--      em leiloes passados — auction_id vira NULL)
-- ============================================================
DELETE FROM auction_events
WHERE auction_date <= '2026-07-31';

DO $$ BEGIN RAISE NOTICE '  [OK] auction_events removido (CASCADE: user_favorite_auctions)'; END $$;

-- ============================================================
-- ETAPA 11: Limpar property_auction_history residual
--
-- Propriedades futuras que também participavam de leiloes passados
-- terão entradas com auction_date <= 2026-07-31 remanescentes.
-- Removemos essas entradas pois o leilao referenciado nao existe mais.
-- ============================================================
DELETE FROM property_auction_history
WHERE auction_date <= '2026-07-31';

DO $$ BEGIN RAISE NOTICE '  [OK] property_auction_history residual (leiloes passados) limpo'; END $$;

-- ============================================================
-- ETAPA 12: Audit pos-remocao
-- ============================================================
DO $$
DECLARE
    cnt_auctions     INTEGER;
    cnt_pah          INTEGER;
    cnt_properties   INTEGER;
    cnt_scores       INTEGER;
    cnt_overrides    INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt_auctions    FROM auction_events;
    SELECT COUNT(*) INTO cnt_pah         FROM property_auction_history;
    SELECT COUNT(*) INTO cnt_properties  FROM property_details;
    SELECT COUNT(*) INTO cnt_scores      FROM property_scores;
    SELECT COUNT(*) INTO cnt_overrides   FROM property_user_overrides;

    RAISE NOTICE '==========================================================';
    RAISE NOTICE '  AUDIT POS-REMOCAO';
    RAISE NOTICE '==========================================================';
    RAISE NOTICE '  auction_events restantes:           %', cnt_auctions;
    RAISE NOTICE '  property_auction_history restantes: %', cnt_pah;
    RAISE NOTICE '  property_details restantes:         %', cnt_properties;
    RAISE NOTICE '  property_scores restantes:          %', cnt_scores;
    RAISE NOTICE '  property_user_overrides restantes:  %', cnt_overrides;
    RAISE NOTICE '==========================================================';
END $$;

COMMIT;

-- ============================================================
-- ETAPA 13: VACUUM ANALYZE (após commit — libera espaco em disco)
-- Deve rodar fora de transação
-- ============================================================
VACUUM ANALYZE property_details;
VACUUM ANALYZE auction_events;
VACUUM ANALYZE property_auction_history;
VACUUM ANALYZE property_availability_history;
VACUUM ANALYZE property_scores;
VACUUM ANALYZE property_user_overrides;
VACUUM ANALYZE client_list_property;
VACUUM ANALYZE client_notes;
VACUUM ANALYZE client_attachments;
VACUUM ANALYZE user_favorite_auctions;
