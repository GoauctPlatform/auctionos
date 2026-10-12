#!/usr/bin/env python3
"""
reconcile_collided_auctions.py

Corrige em alta performance, segurança e responsabilidade as colisões de IDs
entre o Agent-Extrator e o Banco de Dados PostgreSQL:

1. Carrega os leilões e mapeamentos de histórico do Agent-Extrator.
2. Identifica os leilões futuros (ou específicos) com colisão de ID.
3. Cria tabelas temporárias no PostgreSQL para execução ultra-rápida via psycopg2 execute_values.
4. Faz a classificação e deduplicação inteligente por (property_id, target_name) priorizando a data mais recente.
5. Reassocia todas as propriedades ao ID oficial, nome oficial e data oficial.
6. Atualiza o parcels_count de todos os leilões afetados.
7. Atualiza o availability_status para 'available' de todas as propriedades com leilões futuros.
"""

import os
import sys
import csv
import argparse
from datetime import datetime
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Carrega ambiente backend
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))
sys.path.insert(0, backend_dir)

from app.db.session import engine
from sqlalchemy import text
from psycopg2.extras import execute_values

CSV_AUCTIONS_PATH = r"c:\Users\user\Documents\Dev\Projects\Agent-Extrator\postgres_auction_events.csv"
CSV_HISTORY_PATH = r"c:\Users\user\Documents\Dev\Projects\Agent-Extrator\postgres_property_auction_history.csv"


def log(msg: str):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)


def load_extrator_data():
    log("📂 Carregando leilões do Agent-Extrator...")
    csv_auctions = {}
    with open(CSV_AUCTIONS_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) > 8 and row[0].isdigit():
                cid = int(row[0])
                csv_auctions[cid] = {
                    "csv_id": cid,
                    "name": row[1].strip(),
                    "date": row[3].strip()[:10],
                    "county": row[6].strip() if len(row) > 6 else "",
                    "state": row[8].strip() if len(row) > 8 else "",
                }
    log(f"✅ {len(csv_auctions)} leilões carregados do CSV.")

    log("📂 Indexando propriedades do CSV de histórico...")
    csv_history_by_auction = {}
    total_hist = 0
    with open(CSV_HISTORY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) >= 2 and row[1].isdigit():
                cid = int(row[1])
                pid = row[0].strip()
                if cid not in csv_history_by_auction:
                    csv_history_by_auction[cid] = []
                csv_history_by_auction[cid].append(pid)
                total_hist += 1
    log(f"✅ {total_hist} registros indexados em {len(csv_history_by_auction)} leilões.")

    return csv_auctions, csv_history_by_auction


def get_auction_mappings(conn, csv_auctions):
    log("🔍 Mapeando correspondências entre CSV e PostgreSQL...")
    db_rows = conn.execute(text("SELECT id, name, auction_date, county, state FROM auction_events")).fetchall()
    db_by_key = {}
    db_by_id = {}
    for r in db_rows:
        db_by_id[r[0]] = dict(r._mapping)
        key = (r[1].strip().lower(), str(r[2]))
        if key not in db_by_key:
            db_by_key[key] = []
        db_by_key[key].append(r[0])

    csv_to_db_id = {}
    mismatches = {}
    for cid, cdata in csv_auctions.items():
        key = (cdata["name"].lower(), cdata["date"])
        if key in db_by_key:
            matches = db_by_key[key]
            if len(matches) == 1:
                target_id = matches[0]
            else:
                state_matches = [m for m in matches if db_by_id[m].get("state") == cdata["state"]]
                target_id = state_matches[0] if state_matches else matches[0]
            
            csv_to_db_id[cid] = target_id
            if cid != target_id:
                mismatches[cid] = {
                    "csv_id": cid,
                    "target_db_id": target_id,
                    "name": cdata["name"],
                    "date": cdata["date"],
                    "county": cdata["county"],
                    "state": cdata["state"]
                }

    log(f"✅ Mapeados {len(csv_to_db_id)} leilões. Total de colisões de ID: {len(mismatches)}")
    return csv_to_db_id, mismatches


def bulk_reconcile(conn, mismatches, csv_history_by_auction, target_filter_id=None, dry_run=True):
    log("=" * 75)
    log(f"🚀 INICIANDO RECONCILIAÇÃO BULK ({'DRY-RUN / SIMULAÇÃO' if dry_run else 'EXECUÇÃO REAL'})")
    log("=" * 75)

    today_str = datetime.now().strftime("%Y-%m-%d")
    
    selected_mismatches = []
    for cid, m in mismatches.items():
        if target_filter_id:
            if m["target_db_id"] == target_filter_id or m["csv_id"] == target_filter_id:
                selected_mismatches.append(m)
        else:
            if m["date"] >= today_str:
                selected_mismatches.append(m)

    log(f"Leilões futuros/selecionados com colisão: {len(selected_mismatches)}")

    map_tuples = []
    hist_tuples = []
    for m in selected_mismatches:
        cid = m["csv_id"]
        pids = csv_history_by_auction.get(cid, [])
        if not pids:
            continue
        map_tuples.append((cid, m["target_db_id"], m["name"], m["date"]))
        for pid in pids:
            hist_tuples.append((pid, cid))

    log(f"Total de pares de mapeamento: {len(map_tuples)}")
    log(f"Total de propriedades envolvidas nos leilões selecionados: {len(hist_tuples)}")

    dbapi_conn = conn.connection.dbapi_connection
    cur = dbapi_conn.cursor()

    cur.execute("""
        CREATE TEMP TABLE temp_collision_map (
            csv_id INT,
            target_db_id INT,
            target_name VARCHAR(255),
            target_date DATE
        ) ON COMMIT DROP;
    """)
    cur.execute("""
        CREATE TEMP TABLE temp_csv_history (
            property_id VARCHAR(36),
            csv_id INT
        ) ON COMMIT DROP;
    """)

    log("⚡ Carregando tabelas temporárias com execute_values...")
    execute_values(cur, """
        INSERT INTO temp_collision_map (csv_id, target_db_id, target_name, target_date)
        VALUES %s
    """, map_tuples)

    execute_values(cur, """
        INSERT INTO temp_csv_history (property_id, csv_id)
        VALUES %s
    """, hist_tuples, page_size=10000)

    cur.execute("CREATE INDEX ON temp_csv_history (property_id, csv_id);")
    cur.execute("CREATE INDEX ON temp_collision_map (csv_id);")

    # Criar tabela de updates classificados por (property_id, target_name)
    cur.execute("""
        CREATE TEMP TABLE ranked_updates AS
        SELECT 
            th.property_id,
            th.csv_id,
            m.target_db_id,
            m.target_name,
            m.target_date,
            ROW_NUMBER() OVER (
                PARTITION BY th.property_id, m.target_name 
                ORDER BY m.target_date DESC, m.target_db_id DESC
            ) as rn
        FROM temp_csv_history th
        JOIN temp_collision_map m ON th.csv_id = m.csv_id;
    """)
    cur.execute("CREATE INDEX ON ranked_updates (property_id, csv_id, rn);")
    cur.execute("CREATE INDEX ON ranked_updates (property_id, target_name);")
    log("✅ Mapeamento classificado e deduplicado com sucesso.")

    if dry_run:
        cur.execute("""
            SELECT count(*)
            FROM property_auction_history pah
            JOIN ranked_updates ru ON pah.property_id = ru.property_id AND pah.auction_id = ru.csv_id
            WHERE ru.rn = 1
        """)
        count_stuck = cur.fetchone()[0]

        cur.execute("""
            SELECT count(DISTINCT p.property_id)
            FROM property_details p
            JOIN ranked_updates ru ON p.property_id = ru.property_id
            WHERE ru.rn = 1 AND (p.availability_status IS NULL OR p.availability_status != 'available')
        """)
        count_avail_needed = cur.fetchone()[0]

        log(f"ℹ️  [DRY-RUN] Simulação concluída com sucesso:")
        log(f"   • Propriedades principais a serem migradas: {count_stuck}")
        log(f"   • Propriedades que serão atualizadas para 'available': {count_avail_needed}")
        log("=" * 75)
        cur.close()
        return

    # EXECUÇÃO REAL
    # 1. Remover instâncias secundárias (rn > 1) que gerariam colisão de nome para a mesma propriedade
    log("⚡ Executando Etapa 1: Limpeza de linhas secundárias duplicadas (rn > 1)...")
    cur.execute("""
        DELETE FROM property_auction_history pah
        USING ranked_updates ru
        WHERE pah.property_id = ru.property_id
          AND pah.auction_id = ru.csv_id
          AND ru.rn > 1
    """)
    rows_rn_del = cur.rowcount
    log(f"   ✅ Linhas secundárias removidas: {rows_rn_del}")

    # 2. Para as principais (rn = 1): se já existe uma linha em pah com target_name, atualizar aquela linha
    log("⚡ Executando Etapa 2: Atualização de linhas pré-existentes com o mesmo auction_name...")
    cur.execute("""
        UPDATE property_auction_history pah
        SET auction_id = ru.target_db_id,
            auction_date = ru.target_date
        FROM ranked_updates ru
        WHERE pah.property_id = ru.property_id
          AND pah.auction_name = ru.target_name
          AND ru.rn = 1
    """)
    rows_merged = cur.rowcount
    log(f"   ✅ Linhas pré-existentes mescladas: {rows_merged}")

    # 3. Remover a linha legada (auction_id = csv_id) para as que já têm o target_db_id gravado
    log("⚡ Executando Etapa 3: Remoção do vínculo legado após mesclagem...")
    cur.execute("""
        DELETE FROM property_auction_history pah
        USING ranked_updates ru
        WHERE pah.property_id = ru.property_id
          AND pah.auction_id = ru.csv_id
          AND ru.rn = 1
          AND EXISTS (
              SELECT 1 FROM property_auction_history pah_target
              WHERE pah_target.property_id = ru.property_id
                AND pah_target.auction_id = ru.target_db_id
                AND pah_target.id != pah.id
          )
    """)
    rows_del_merged = cur.rowcount
    log(f"   ✅ Linhas legadas redundantes removidas: {rows_del_merged}")

    # 4. Atualizar as linhas legadas restantes (rn = 1) para o leilão oficial
    log("⚡ Executando Etapa 4: Reassociação em massa das propriedades restantes...")
    cur.execute("""
        UPDATE property_auction_history pah
        SET auction_id = ru.target_db_id,
            auction_name = ru.target_name,
            auction_date = ru.target_date
        FROM ranked_updates ru
        WHERE pah.property_id = ru.property_id
          AND pah.auction_id = ru.csv_id
          AND ru.rn = 1
          AND NOT EXISTS (
              SELECT 1 FROM property_auction_history pah_conflict
              WHERE pah_conflict.property_id = ru.property_id
                AND pah_conflict.auction_name = ru.target_name
                AND pah_conflict.id != pah.id
          )
    """)
    rows_updated = cur.rowcount
    log(f"   ✅ Propriedades migradas/revinculadas: {rows_updated}")

    # 5. Atualizar contadores parcels_count em massa
    log("⚡ Executando Etapa 5: Atualização em massa dos contadores parcels_count nos leilões...")
    cur.execute("""
        UPDATE auction_events a
        SET parcels_count = sub.cnt,
            updated_at = NOW()
        FROM (
            SELECT auction_id, count(*) as cnt
            FROM property_auction_history
            WHERE auction_id IN (SELECT DISTINCT target_db_id FROM ranked_updates)
            GROUP BY auction_id
        ) sub
        WHERE a.id = sub.auction_id
    """)
    rows_parcels = cur.rowcount
    log(f"   ✅ Contadores de leilões atualizados: {rows_parcels}")

    # 6. Atualizar status para 'available'
    log("⚡ Executando Etapa 6: Reconciliação do status de disponibilidade ('available')...")
    cur.execute("""
        UPDATE property_details p
        SET availability_status = 'available'
        FROM property_auction_history pah
        JOIN ranked_updates ru ON pah.property_id = ru.property_id AND pah.auction_id = ru.target_db_id
        WHERE p.property_id = pah.property_id
          AND ru.target_date >= CURRENT_DATE
          AND (p.availability_status IS NULL OR p.availability_status != 'available')
    """)
    rows_avail = cur.rowcount
    log(f"   ✅ Propriedades atualizadas para 'available': {rows_avail}")

    dbapi_conn.commit()
    cur.close()

    log("=" * 75)
    log("🎉 [BULK APPLIED] RECONCILIAÇÃO GLOBAL CONCLUÍDA COM TOTAL SEGURANÇA E SUCESSO!")
    log(f"   • Propriedades migradas para leilões oficiais: {rows_updated}")
    log(f"   • Propriedades mescladas sem colisão: {rows_merged}")
    log(f"   • Linhas legadas duplicadas limpas: {rows_rn_del + rows_del_merged}")
    log(f"   • Leilões com parcels_count atualizado: {rows_parcels}")
    log(f"   • Propriedades disponibilizadas ('available'): {rows_avail}")
    log("=" * 75)


def main():
    parser = argparse.ArgumentParser(description="Reconciliação segura em lote de leilões e propriedades colididos")
    parser.add_argument("--apply", action="store_true", help="Aplica as alterações no banco de dados")
    parser.add_argument("--dry-run", action="store_true", help="Simula as alterações sem modificar nada")
    parser.add_argument("--auction-id", type=int, default=None, help="Executar apenas para um ID de leilão específico")
    args = parser.parse_args()

    dry_run = not args.apply

    csv_auctions, csv_history_by_auction = load_extrator_data()
    with engine.connect() as conn:
        csv_to_db_id, mismatches = get_auction_mappings(conn, csv_auctions)
        bulk_reconcile(conn, mismatches, csv_history_by_auction, target_filter_id=args.auction_id, dry_run=dry_run)


if __name__ == "__main__":
    main()
