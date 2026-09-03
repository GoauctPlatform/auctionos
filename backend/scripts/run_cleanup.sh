#!/usr/bin/env bash
# ==============================================================
# run_cleanup.sh — Remoção segura de dados históricos
#
# O que este script faz:
#   1. Valida a variável DATABASE_URL
#   2. Faz pg_dump completo ANTES de qualquer DELETE
#   3. Exibe preview das contagens (dry-run via SELECT)
#   4. Pede confirmação explícita antes de executar
#   5. Roda o SQL de cleanup em transação única
#   6. Exibe relatório final
#
# Uso:
#   cd backend
#   chmod +x scripts/run_cleanup.sh
#   ./scripts/run_cleanup.sh
#
#   Ou passando a URL diretamente:
#   DATABASE_URL="postgresql://..." ./scripts/run_cleanup.sh
# ==============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/cleanup_historical_data.sql"
BACKUP_DIR="$SCRIPT_DIR/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/pre_cleanup_backup_${TIMESTAMP}.dump"

# ──────────────────────────────────────────────────────────────
# Cores para output
# ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}  AuctionOS — Cleanup de Dados Históricos${NC}"
echo -e "${BOLD}${CYAN}  Remove: propriedades + leilões <= jul/2026${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}"
echo ""

# ──────────────────────────────────────────────────────────────
# 1. Validar DATABASE_URL
# ──────────────────────────────────────────────────────────────
# Tenta carregar do .env se não estiver no ambiente
if [ -z "${DATABASE_URL:-}" ]; then
    ENV_FILE="$SCRIPT_DIR/../.env"
    if [ -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}[INFO] DATABASE_URL não encontrada no ambiente, carregando do .env...${NC}"
        # Extrai apenas a linha DATABASE_URL (ignora comentários)
        export DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)
    fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}[ERRO] DATABASE_URL não definida.${NC}"
    echo "       Defina a variável de ambiente ou use o arquivo .env"
    echo "       Exemplo: export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

echo -e "${GREEN}[OK] DATABASE_URL carregada.${NC}"

# ──────────────────────────────────────────────────────────────
# 2. Verificar dependências
# ──────────────────────────────────────────────────────────────
for cmd in psql pg_dump; do
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${RED}[ERRO] '$cmd' não encontrado.${NC}"
        echo "       Instale com: brew install libpq && brew link --force libpq"
        exit 1
    fi
done

echo -e "${GREEN}[OK] psql e pg_dump encontrados.${NC}"

# ──────────────────────────────────────────────────────────────
# 3. Preview (dry-run) — mostra o que será removido
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[PREVIEW] Contagens do que será removido:${NC}"
echo "─────────────────────────────────────────────────────"

psql "$DATABASE_URL" --no-psqlrc -t -A -c "
SELECT
    'auction_events a remover (date <= 2026-07-31)'             AS tabela,
    COUNT(*)::text                                               AS quantidade
FROM auction_events WHERE auction_date <= '2026-07-31'

UNION ALL

SELECT
    'user_favorite_auctions afetados (cascade)',
    COUNT(*)::text
FROM user_favorite_auctions
WHERE auction_id IN (SELECT id FROM auction_events WHERE auction_date <= '2026-07-31')

UNION ALL

SELECT
    'property_details SEM leilao futuro (serao removidas)',
    COUNT(*)::text
FROM property_details pd
WHERE NOT EXISTS (
    SELECT 1 FROM property_auction_history pah
    WHERE pah.property_id = pd.property_id
      AND pah.auction_date >= '2026-08-01'
)

UNION ALL

SELECT
    'property_auction_history (date <= 2026-07-31)',
    COUNT(*)::text
FROM property_auction_history WHERE auction_date <= '2026-07-31'

UNION ALL

SELECT
    'auction_events restantes apos limpeza (date >= 2026-08-01)',
    COUNT(*)::text
FROM auction_events WHERE auction_date >= '2026-08-01'

UNION ALL

SELECT
    'property_details que serao MANTIDAS (tem leilao futuro)',
    COUNT(*)::text
FROM property_details pd
WHERE EXISTS (
    SELECT 1 FROM property_auction_history pah
    WHERE pah.property_id = pd.property_id
      AND pah.auction_date >= '2026-08-01'
);
" | awk -F'|' '{printf "  %-55s %s\n", $1, $2}'

echo "─────────────────────────────────────────────────────"
echo ""

# ──────────────────────────────────────────────────────────────
# 4. Confirmação antes do backup
# ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[ATENÇÃO] Esta operação é IRREVERSÍVEL após o commit.${NC}"
echo -e "${YELLOW}          Um backup completo será feito antes de prosseguir.${NC}"
echo ""
read -p "$(echo -e ${BOLD})Deseja continuar? Digite 'CONFIRMAR' para prosseguir: $(echo -e ${NC})" CONFIRM

if [ "$CONFIRM" != "CONFIRMAR" ]; then
    echo -e "${RED}[CANCELADO] Nenhuma alteração foi feita.${NC}"
    exit 0
fi

# ──────────────────────────────────────────────────────────────
# 5. Backup completo
# ──────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
echo ""
echo -e "${CYAN}[BACKUP] Iniciando pg_dump completo...${NC}"
echo "         Destino: $BACKUP_FILE"

if pg_dump \
    --format=custom \
    --no-acl \
    --no-owner \
    --verbose \
    "$DATABASE_URL" \
    -f "$BACKUP_FILE" 2>&1 | tail -5; then
    
    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}[OK] Backup concluído: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}[ERRO] Backup falhou! Abortando sem nenhuma modificação.${NC}"
    exit 1
fi

# ──────────────────────────────────────────────────────────────
# 6. Executar SQL de cleanup
# ──────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}[CLEANUP] Executando script SQL em transação única...${NC}"
echo "          (qualquer erro fará ROLLBACK automático)"
echo ""

if psql \
    "$DATABASE_URL" \
    --no-psqlrc \
    --set ON_ERROR_STOP=on \
    -f "$SQL_FILE"; then
    
    echo ""
    echo -e "${GREEN}${BOLD}================================================${NC}"
    echo -e "${GREEN}${BOLD}  CLEANUP CONCLUÍDO COM SUCESSO${NC}"
    echo -e "${GREEN}${BOLD}================================================${NC}"
    echo ""
    echo -e "  Backup salvo em: ${CYAN}$BACKUP_FILE${NC}"
    echo ""
    echo -e "${YELLOW}[DICA] Para restaurar o backup se necessário:${NC}"
    echo "       pg_restore --clean --no-acl --no-owner -d \$DATABASE_URL $BACKUP_FILE"
    echo ""
else
    echo ""
    echo -e "${RED}${BOLD}[ERRO] O cleanup falhou. ROLLBACK automático foi aplicado.${NC}"
    echo -e "${RED}       Nenhum dado foi removido do banco.${NC}"
    echo ""
    echo "Backup disponível em: $BACKUP_FILE"
    exit 1
fi
