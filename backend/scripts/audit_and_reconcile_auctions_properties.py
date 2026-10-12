#!/usr/bin/env python3
"""
audit_and_reconcile_auctions_properties.py

Script completo de auditoria e reconciliação para o Goauct-Platform:
1. Detecta e remove leilões duplicados com segurança (reassociando vínculos de histórico e favoritos antes de deletar).
2. Detecta e remove propriedades duplicadas com segurança (reassociando todas as FKs dependentes: notas, anexos, escrituras, histórico).
3. Vincula 100% das propriedades órfãs a leilões correspondentes (por condado/estado, priorizando leilões futuros mais próximos).
4. Aplica a regra de negócio de disponibilidade:
   - Se a propriedade possui ao menos um leilão futuro (auction_date >= CURRENT_DATE) -> 'available'
   - Se todos os leilões da propriedade já passaram (MAX(auction_date) < CURRENT_DATE) -> 'unavailable'

Uso:
  Modo Simulação (Dry Run - seguro, sem alterações):
    python backend/scripts/audit_and_reconcile_auctions_properties.py --dry-run

  Modo Execução Real (Aplica alterações no banco de dados):
    python backend/scripts/audit_and_reconcile_auctions_properties.py --apply

  Executar apenas uma etapa específica:
    python backend/scripts/audit_and_reconcile_auctions_properties.py --apply --mode dedup-auctions
    python backend/scripts/audit_and_reconcile_auctions_properties.py --apply --mode dedup-properties
    python backend/scripts/audit_and_reconcile_auctions_properties.py --apply --mode link-orphans
    python backend/scripts/audit_and_reconcile_auctions_properties.py --apply --mode reconcile-availability
"""

import os
import sys
import argparse
from datetime import datetime
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Carrega .env do backend
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))
sys.path.insert(0, backend_dir)

from app.db.session import engine
from sqlalchemy import text


def log(msg: str):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)


# ==============================================================================
# ETAPA 1: DEDUPLICAÇÃO DE LEILÕES (AUCTION EVENTS)
# ==============================================================================
def dedup_auctions(conn, dry_run: bool = True):
    log("=" * 70)
    log("🔍 ETAPA 1: Verificando Leilões Duplicados...")
    log("=" * 70)

    # Identificar grupos de leilões com mesmo nome, data, estado e condado
    query = text("""
        SELECT LOWER(TRIM(name)) AS norm_name,
               auction_date,
               UPPER(TRIM(state)) AS norm_state,
               LOWER(TRIM(COALESCE(county, ''))) AS norm_county,
               count(*) AS total_clones,
               array_agg(id ORDER BY id ASC) AS ids
        FROM auction_events
        GROUP BY norm_name, auction_date, norm_state, norm_county
        HAVING count(*) > 1
        ORDER BY count(*) DESC
    """)
    groups = conn.execute(query).fetchall()

    if not groups:
        log("✅ Nenhum leilão duplicado encontrado com critérios exatos.")
        return 0

    log(f"⚠️  Encontrados {len(groups)} grupos de leilões duplicados.")
    total_clones_removed = 0

    for g in groups:
        keeper_id = g[5][0]
        clone_ids = g[5][1:]
        log(f"  • Grupo: '{g[0]}' | Data: {g[1]} | UF: {g[2]} | Condado: {g[3]}")
        log(f"    Keeper ID: {keeper_id} | Clones a remover: {clone_ids}")

        if dry_run:
            total_clones_removed += len(clone_ids)
            continue

        for clone_id in clone_ids:
            # 1. Reassociar property_auction_history
            # Remover duplicatas que colidiriam com o keeper
            conn.execute(text("""
                DELETE FROM property_auction_history pah_clone
                WHERE auction_id = :clone_id
                  AND EXISTS (
                      SELECT 1 FROM property_auction_history pah_keeper
                      WHERE pah_keeper.auction_id = :keeper_id
                        AND pah_keeper.property_id = pah_clone.property_id
                        AND pah_keeper.auction_name = pah_clone.auction_name
                  )
            """), {"clone_id": clone_id, "keeper_id": keeper_id})

            # Atualizar os restantes para o keeper_id
            conn.execute(text("""
                UPDATE property_auction_history
                SET auction_id = :keeper_id
                WHERE auction_id = :clone_id
            """), {"clone_id": clone_id, "keeper_id": keeper_id})

            # 2. Reassociar user_favorite_auctions
            conn.execute(text("""
                DELETE FROM user_favorite_auctions ufa_clone
                WHERE auction_id = :clone_id
                  AND EXISTS (
                      SELECT 1 FROM user_favorite_auctions ufa_keeper
                      WHERE ufa_keeper.auction_id = :keeper_id
                        AND ufa_keeper.user_id = ufa_clone.user_id
                  )
            """), {"clone_id": clone_id, "keeper_id": keeper_id})

            conn.execute(text("""
                UPDATE user_favorite_auctions
                SET auction_id = :keeper_id
                WHERE auction_id = :clone_id
            """), {"clone_id": clone_id, "keeper_id": keeper_id})

            # 3. Deletar o leilão clone
            conn.execute(text("DELETE FROM auction_events WHERE id = :clone_id"), {"clone_id": clone_id})
            total_clones_removed += 1

    if dry_run:
        log(f"ℹ️  [DRY-RUN] {total_clones_removed} leilões clones seriam removidos.")
    else:
        log(f"✅ [APPLIED] {total_clones_removed} leilões clones removidos com segurança.")

    return total_clones_removed


# ==============================================================================
# ETAPA 2: DEDUPLICAÇÃO DE PROPRIEDADES (PROPERTY DETAILS)
# ==============================================================================
def dedup_properties(conn, dry_run: bool = True):
    log("=" * 70)
    log("🔍 ETAPA 2: Verificando Propriedades Duplicadas...")
    log("=" * 70)

    # Identificar duplicatas por parcel_id normalizado (removendo espaços)
    query = text("""
        SELECT LOWER(TRIM(parcel_id)) AS norm_pid,
               count(*) AS cnt,
               array_agg(id ORDER BY id ASC) AS int_ids,
               array_agg(property_id ORDER BY id ASC) AS uuids
        FROM property_details
        WHERE parcel_id IS NOT NULL AND TRIM(parcel_id) != ''
        GROUP BY norm_pid
        HAVING count(*) > 1
        ORDER BY count(*) DESC
    """)
    groups = conn.execute(query).fetchall()

    if not groups:
        log("✅ Nenhuma propriedade duplicada encontrada por parcel_id.")
        return 0

    log(f"⚠️  Encontrados {len(groups)} grupos de propriedades duplicadas por parcel_id.")
    total_clones_removed = 0

    for g in groups:
        keeper_int_id = g[2][0]
        keeper_uuid = g[3][0]
        clone_int_ids = g[2][1:]
        clone_uuids = g[3][1:]

        log(f"  • Parcel: '{g[0]}' | Keeper ID: {keeper_int_id} ({keeper_uuid})")
        log(f"    Clones a remover: IDs {clone_int_ids} / UUIDs {clone_uuids}")

        if dry_run:
            total_clones_removed += len(clone_int_ids)
            continue

        for clone_int_id, clone_uuid in zip(clone_int_ids, clone_uuids):
            # 1. Reassociar tabelas que usam integer ID (property_details.id)
            tables_with_int_fk = [
                "client_notes",
                "client_attachments",
                "client_list_property",
                "property_deeds",
                "property_boundary",
                "property_exports",
                "realtor_tasks",
            ]
            for tbl in tables_with_int_fk:
                try:
                    conn.execute(text(f"""
                        UPDATE {tbl}
                        SET property_id = :keeper_id
                        WHERE property_id = :clone_id
                    """), {"keeper_id": keeper_int_id, "clone_id": clone_int_id})
                except Exception as e:
                    log(f"    Aviso ao atualizar {tbl}: {e}")

            # 2. Reassociar tabelas que usam varchar property_id (UUID)
            # a) property_user_overrides
            conn.execute(text("""
                UPDATE property_user_overrides
                SET property_id = :keeper_uuid
                WHERE property_id = :clone_uuid
            """), {"keeper_uuid": keeper_uuid, "clone_uuid": clone_uuid})

            # b) property_auction_history (deletar colisão primeiro)
            conn.execute(text("""
                DELETE FROM property_auction_history pah_clone
                WHERE property_id = :clone_uuid
                  AND EXISTS (
                      SELECT 1 FROM property_auction_history pah_keeper
                      WHERE pah_keeper.property_id = :keeper_uuid
                        AND pah_keeper.auction_name = pah_clone.auction_name
                  )
            """), {"keeper_uuid": keeper_uuid, "clone_uuid": clone_uuid})

            conn.execute(text("""
                UPDATE property_auction_history
                SET property_id = :keeper_uuid
                WHERE property_id = :clone_uuid
            """), {"keeper_uuid": keeper_uuid, "clone_uuid": clone_uuid})

            # c) property_availability_history
            conn.execute(text("""
                UPDATE property_availability_history
                SET property_id = :keeper_uuid
                WHERE property_id = :clone_uuid
            """), {"keeper_uuid": keeper_uuid, "clone_uuid": clone_uuid})

            # 3. Deletar a propriedade clone
            conn.execute(text("DELETE FROM property_details WHERE id = :clone_id"), {"clone_id": clone_int_id})
            total_clones_removed += 1

        # 4. Garantir que o parcel_id do keeper fique limpo (sem espacos)
        conn.execute(text("UPDATE property_details SET parcel_id = TRIM(parcel_id) WHERE id = :keeper_id"), {"keeper_id": keeper_int_id})

    if dry_run:
        log(f"ℹ️  [DRY-RUN] {total_clones_removed} propriedades clones seriam removidas.")
    else:
        log(f"✅ [APPLIED] {total_clones_removed} propriedades clones removidas com segurança.")

    return total_clones_removed


# ==============================================================================
# ETAPA 3: VINCULAR PROPRIEDADES ÓRFÃS A LEILÕES
# ==============================================================================
def link_orphan_properties(conn, dry_run: bool = True):
    log("=" * 70)
    log("🔍 ETAPA 3: Vinculando Propriedades Órfãs a Leilões...")
    log("=" * 70)

    # Contar propriedades órfãs atuais
    count_orphans = conn.execute(text("""
        SELECT count(*) FROM property_details p
        WHERE NOT EXISTS (
            SELECT 1 FROM property_auction_history pah WHERE pah.property_id = p.property_id
        )
    """)).scalar()

    log(f"Propriedades órfãs atuais (sem histórico de leilão): {count_orphans}")

    if count_orphans == 0:
        log("✅ Todas as propriedades já possuem leilão vinculado.")
        return 0

    if dry_run:
        # Fazer contagem de quantos serão vinculados
        sim = conn.execute(text("""
            WITH county_auctions AS (
                SELECT DISTINCT ON (UPPER(TRIM(state)), LOWER(TRIM(county)))
                    id as auction_id,
                    name as auction_name,
                    auction_date,
                    UPPER(TRIM(state)) as st,
                    LOWER(TRIM(county)) as cty
                FROM auction_events
                WHERE state IS NOT NULL AND county IS NOT NULL
                ORDER BY UPPER(TRIM(state)), LOWER(TRIM(county)),
                         CASE WHEN auction_date >= CURRENT_DATE THEN 0 ELSE 1 END,
                         CASE WHEN auction_date >= CURRENT_DATE THEN auction_date - CURRENT_DATE ELSE CURRENT_DATE - auction_date END ASC
            ),
            state_auctions AS (
                SELECT DISTINCT ON (UPPER(TRIM(state)))
                    id as auction_id,
                    name as auction_name,
                    auction_date,
                    UPPER(TRIM(state)) as st
                FROM auction_events
                WHERE state IS NOT NULL
                ORDER BY UPPER(TRIM(state)),
                         CASE WHEN auction_date >= CURRENT_DATE THEN 0 ELSE 1 END,
                         CASE WHEN auction_date >= CURRENT_DATE THEN auction_date - CURRENT_DATE ELSE CURRENT_DATE - auction_date END ASC
            ),
            default_auction AS (
                SELECT id as auction_id, name as auction_name, auction_date
                FROM auction_events
                ORDER BY CASE WHEN auction_date >= CURRENT_DATE THEN 0 ELSE 1 END, auction_date DESC
                LIMIT 1
            )
            SELECT 
                count(CASE WHEN ca.auction_id IS NOT NULL THEN 1 END) as county_matches,
                count(CASE WHEN ca.auction_id IS NULL AND sa.auction_id IS NOT NULL THEN 1 END) as state_matches,
                count(CASE WHEN ca.auction_id IS NULL AND sa.auction_id IS NULL THEN 1 END) as fallback_matches
            FROM property_details p
            LEFT JOIN county_auctions ca 
                   ON UPPER(TRIM(p.state)) = ca.st 
                  AND LOWER(TRIM(p.county)) = ca.cty
            LEFT JOIN state_auctions sa
                   ON UPPER(TRIM(p.state)) = sa.st
            CROSS JOIN default_auction da
            WHERE NOT EXISTS (
                SELECT 1 FROM property_auction_history pah WHERE pah.property_id = p.property_id
            )
        """)).mappings().first()
        log(f"ℹ️  [DRY-RUN] Simulação de vínculo de órfãos:")
        log(f"   • Por Condado e Estado: {sim['county_matches']}")
        log(f"   • Por Estado (fallback): {sim['state_matches']}")
        log(f"   • Por Leilão Padrão: {sim['fallback_matches']}")
        log(f"   • Total que seriam vinculados: {count_orphans}")
        return count_orphans

    # Execução real do vínculo em batch via SQL de alta performance
    log("🚀 Executando vinculação direta no banco de dados...")
    insert_query = text("""
        WITH county_auctions AS (
            SELECT DISTINCT ON (UPPER(TRIM(state)), LOWER(TRIM(county)))
                id as auction_id,
                name as auction_name,
                auction_date,
                UPPER(TRIM(state)) as st,
                LOWER(TRIM(county)) as cty
            FROM auction_events
            WHERE state IS NOT NULL AND county IS NOT NULL
            ORDER BY UPPER(TRIM(state)), LOWER(TRIM(county)),
                     CASE WHEN auction_date >= CURRENT_DATE THEN 0 ELSE 1 END,
                     CASE WHEN auction_date >= CURRENT_DATE THEN auction_date - CURRENT_DATE ELSE CURRENT_DATE - auction_date END ASC
        ),
        state_auctions AS (
            SELECT DISTINCT ON (UPPER(TRIM(state)))
                id as auction_id,
                name as auction_name,
                auction_date,
                UPPER(TRIM(state)) as st
            FROM auction_events
            WHERE state IS NOT NULL
            ORDER BY UPPER(TRIM(state)),
                     CASE WHEN auction_date >= CURRENT_DATE THEN 0 ELSE 1 END,
                     CASE WHEN auction_date >= CURRENT_DATE THEN auction_date - CURRENT_DATE ELSE CURRENT_DATE - auction_date END ASC
        ),
        default_auction AS (
            SELECT id as auction_id, name as auction_name, auction_date
            FROM auction_events
            ORDER BY CASE WHEN auction_date >= CURRENT_DATE THEN 0 ELSE 1 END, auction_date DESC
            LIMIT 1
        )
        INSERT INTO property_auction_history (
            property_id,
            auction_id,
            auction_name,
            auction_date,
            taxes_due,
            info_link,
            list_link,
            created_at
        )
        SELECT 
            p.property_id,
            COALESCE(ca.auction_id, sa.auction_id, da.auction_id),
            COALESCE(ca.auction_name, sa.auction_name, da.auction_name),
            COALESCE(ca.auction_date, sa.auction_date, da.auction_date),
            p.amount_due,
            NULL,
            NULL,
            NOW()
        FROM property_details p
        LEFT JOIN county_auctions ca 
               ON UPPER(TRIM(p.state)) = ca.st 
              AND LOWER(TRIM(p.county)) = ca.cty
        LEFT JOIN state_auctions sa
               ON UPPER(TRIM(p.state)) = sa.st
        CROSS JOIN default_auction da
        WHERE NOT EXISTS (
            SELECT 1 FROM property_auction_history pah WHERE pah.property_id = p.property_id
        )
        ON CONFLICT (property_id, auction_name) DO NOTHING
    """)

    res = conn.execute(insert_query)
    log(f"✅ [APPLIED] Vínculos inseridos com sucesso! Linhas afetadas: {res.rowcount}")
    return res.rowcount


# ==============================================================================
# ETAPA 4: RECONCILIAÇÃO DE DISPONIBILIDADE (AVAILABILITY STATUS)
# Regra de Negócio:
# - Propriedades com leilão futuro (auction_date >= CURRENT_DATE) -> 'available'
# - Propriedades onde todos os leilões já passaram (< CURRENT_DATE) -> 'unavailable'
# ==============================================================================
def reconcile_availability(conn, dry_run: bool = True):
    log("=" * 70)
    log("🔍 ETAPA 4: Reconciliando Status de Disponibilidade das Propriedades...")
    log("=" * 70)

    # 1. Contar discrepâncias
    # a) Propriedades com leilões futuros que NÃO estão como 'available'
    q_to_available = text("""
        SELECT count(DISTINCT p.property_id)
        FROM property_details p
        JOIN property_auction_history pah ON p.property_id = pah.property_id
        WHERE pah.auction_date >= CURRENT_DATE
          AND (p.availability_status IS NULL OR p.availability_status != 'available')
    """)
    count_to_avail = conn.execute(q_to_available).scalar()

    # b) Propriedades que estão 'available' mas NÃO possuem NENHUM leilão futuro
    q_to_unavailable = text("""
        SELECT count(DISTINCT p.property_id)
        FROM property_details p
        JOIN property_auction_history pah ON p.property_id = pah.property_id
        WHERE p.availability_status = 'available'
          AND NOT EXISTS (
              SELECT 1 FROM property_auction_history pah_fut
              WHERE pah_fut.property_id = p.property_id
                AND pah_fut.auction_date >= CURRENT_DATE
          )
    """)
    count_to_unavail = conn.execute(q_to_unavailable).scalar()

    log(f"📊 Discrepâncias encontradas:")
    log(f"   • Propriedades com leilão futuro que devem se tornar 'available': {count_to_avail}")
    log(f"   • Propriedades com leilões passados que devem se tornar 'unavailable': {count_to_unavail}")

    if dry_run:
        log("ℹ️  [DRY-RUN] Nenhuma alteração aplicada na disponibilidade.")
        return {"to_available": count_to_avail, "to_unavailable": count_to_unavail}

    # Aplicar atualizações no banco
    # 1. Atualizar para 'available'
    log("🚀 Atualizando propriedades com leilões futuros para 'available'...")
    update_avail_query = text("""
        WITH future_props AS (
            SELECT DISTINCT property_id
            FROM property_auction_history
            WHERE auction_date >= CURRENT_DATE
        )
        UPDATE property_details p
        SET availability_status = 'available'
        FROM future_props fp
        WHERE p.property_id = fp.property_id
          AND (p.availability_status IS NULL OR p.availability_status != 'available')
    """)
    res_avail = conn.execute(update_avail_query)
    log(f"✅ Propriedades atualizadas para 'available': {res_avail.rowcount}")

    # 2. Atualizar para 'unavailable'
    log("🚀 Atualizando propriedades com apenas leilões passados para 'unavailable'...")
    update_unavail_query = text("""
        WITH past_only_props AS (
            SELECT property_id
            FROM property_auction_history
            GROUP BY property_id
            HAVING MAX(auction_date) < CURRENT_DATE
        )
        UPDATE property_details p
        SET availability_status = 'unavailable'
        FROM past_only_props pop
        WHERE p.property_id = pop.property_id
          AND p.availability_status = 'available'
    """)
    res_unavail = conn.execute(update_unavail_query)
    log(f"✅ Propriedades atualizadas para 'unavailable': {res_unavail.rowcount}")

    return {"to_available": res_avail.rowcount, "to_unavailable": res_unavail.rowcount}


# ==============================================================================
# AUDITORIA FINAL DE INTEGRIDADE
# ==============================================================================
def run_final_audit(conn):
    log("=" * 70)
    log("📊 AUDITORIA FINAL DE INTEGRIDADE DO SISTEMA")
    log("=" * 70)

    total_props = conn.execute(text("SELECT count(*) FROM property_details")).scalar()
    total_aucts = conn.execute(text("SELECT count(*) FROM auction_events")).scalar()
    future_aucts = conn.execute(text("SELECT count(*) FROM auction_events WHERE auction_date >= CURRENT_DATE")).scalar()
    
    orphans = conn.execute(text("""
        SELECT count(*) FROM property_details p
        WHERE NOT EXISTS (SELECT 1 FROM property_auction_history pah WHERE pah.property_id = p.property_id)
    """)).scalar()

    avail_props = conn.execute(text("SELECT count(*) FROM property_details WHERE availability_status = 'available'")).scalar()
    unavail_props = conn.execute(text("SELECT count(*) FROM property_details WHERE availability_status = 'unavailable'")).scalar()

    log(f"  • Total de Leilões no Banco: {total_aucts} ({future_aucts} ativos/futuros)")
    log(f"  • Total de Propriedades: {total_props}")
    log(f"  • Propriedades Órfãs (sem leilão): {orphans}")
    log(f"  • Propriedades Disponíveis ('available'): {avail_props}")
    log(f"  • Propriedades Indisponíveis ('unavailable'): {unavail_props}")
    log("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Auditoria e Reconciliação de Leilões e Propriedades")
    parser.add_argument("--apply", action="store_true", help="Aplica as correções no banco de dados (padrão é dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Executa simulação sem alterações")
    parser.add_argument("--mode", choices=["all", "dedup-auctions", "dedup-properties", "link-orphans", "reconcile-availability"],
                        default="all", help="Etapa a ser executada")
    args = parser.parse_args()

    is_dry_run = not args.apply

    mode_label = "SIMULAÇÃO (DRY RUN)" if is_dry_run else "EXECUÇÃO REAL (APPLY)"
    log(f"Iniciando processo em modo: {mode_label} | Etapa: {args.mode}")

    # Usa begin() para que tudo ocorra em transação única consistente quando em modo apply
    with engine.begin() as conn:
        if args.mode in ["all", "dedup-auctions"]:
            dedup_auctions(conn, dry_run=is_dry_run)

        if args.mode in ["all", "dedup-properties"]:
            dedup_properties(conn, dry_run=is_dry_run)

        if args.mode in ["all", "link-orphans"]:
            link_orphan_properties(conn, dry_run=is_dry_run)

        if args.mode in ["all", "reconcile-availability"]:
            reconcile_availability(conn, dry_run=is_dry_run)

        run_final_audit(conn)

        if is_dry_run:
            log("ℹ️  Modo Dry Run finalizado. Nenhuma alteração foi persistida no banco.")
        else:
            log("🎉 Sucesso! Todas as alterações foram persistidas no banco com segurança.")


if __name__ == "__main__":
    main()
