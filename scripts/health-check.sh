#!/bin/bash
# ============================================================
# MCP DevBridge - Post-Deploy Health Verification
# Checks all service endpoints are responding correctly
# ============================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_ok()    { echo -e "  ${GREEN}[PASS]${NC} $1"; }
log_fail()  { echo -e "  ${RED}[FAIL]${NC} $1"; }
log_warn()  { echo -e "  ${YELLOW}[WARN]${NC} $1"; }

BASE_URL="${1:-http://localhost}"
PASS=0
FAIL=0
WARN=0

echo ""
echo "============================================"
echo "  MCP DevBridge - Health Check"
echo "  Target: $BASE_URL"
echo "============================================"
echo ""

check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "$expected_code" ]; then
        log_ok "$name (HTTP $HTTP_CODE)"
        PASS=$((PASS + 1))
    elif [ "$HTTP_CODE" = "000" ]; then
        log_fail "$name - Connection refused or timeout"
        FAIL=$((FAIL + 1))
    else
        log_fail "$name - Expected $expected_code, got $HTTP_CODE"
        FAIL=$((FAIL + 1))
    fi
}

check_json_field() {
    local name="$1"
    local url="$2"
    local field="$3"
    local expected="$4"

    RESPONSE=$(curl -s --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "")

    if [ -z "$RESPONSE" ]; then
        log_fail "$name - No response"
        FAIL=$((FAIL + 1))
        return
    fi

    # Check if jq is available
    if command -v jq &> /dev/null; then
        ACTUAL=$(echo "$RESPONSE" | jq -r ".$field" 2>/dev/null || echo "")
        if [ "$ACTUAL" = "$expected" ]; then
            log_ok "$name ($field=$ACTUAL)"
            PASS=$((PASS + 1))
        else
            log_warn "$name ($field=$ACTUAL, expected $expected)"
            WARN=$((WARN + 1))
        fi
    else
        # Fallback: just check if the field exists in the response
        if echo "$RESPONSE" | grep -q "\"$field\""; then
            log_ok "$name (response contains $field)"
            PASS=$((PASS + 1))
        else
            log_fail "$name (field $field not found in response)"
            FAIL=$((FAIL + 1))
        fi
    fi
}

# --- Nginx ---
echo "Nginx Reverse Proxy"
check_endpoint "Nginx health" "$BASE_URL/nginx-health"
echo ""

# --- Frontend ---
echo "Frontend (Next.js)"
check_endpoint "Homepage" "$BASE_URL/"
echo ""

# --- Backend API ---
echo "Backend API (.NET)"
check_endpoint "API Health endpoint" "$BASE_URL/api/health"
check_json_field "API Health status" "$BASE_URL/api/health" "status" "healthy"
check_endpoint "Dashboard stats" "$BASE_URL/api/health/dashboard"
check_endpoint "Servers list" "$BASE_URL/api/servers"
check_endpoint "Tools list" "$BASE_URL/api/tools"
echo ""

# --- SignalR ---
echo "SignalR Hub"
# SignalR negotiate endpoint returns 200 with POST, but we can check the path exists
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 \
    -X POST "$BASE_URL/hubs/dashboard/negotiate?negotiateVersion=1" \
    -H "Content-Type: application/json" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_ok "SignalR negotiate (HTTP $HTTP_CODE)"
    PASS=$((PASS + 1))
elif [ "$HTTP_CODE" = "000" ]; then
    log_fail "SignalR negotiate - Connection refused"
    FAIL=$((FAIL + 1))
else
    log_warn "SignalR negotiate (HTTP $HTTP_CODE - may require WebSocket)"
    WARN=$((WARN + 1))
fi
echo ""

# --- Docker container status ---
echo "Docker Container Status"
if command -v docker &> /dev/null; then
    CONTAINERS=$(docker ps --filter "name=devbridge" --format "{{.Names}}\t{{.Status}}" 2>/dev/null || echo "")
    if [ -n "$CONTAINERS" ]; then
        while IFS=$'\t' read -r name status; do
            if echo "$status" | grep -q "healthy"; then
                log_ok "$name ($status)"
                PASS=$((PASS + 1))
            elif echo "$status" | grep -q "Up"; then
                log_warn "$name ($status)"
                WARN=$((WARN + 1))
            else
                log_fail "$name ($status)"
                FAIL=$((FAIL + 1))
            fi
        done <<< "$CONTAINERS"
    else
        log_warn "No devbridge containers found"
        WARN=$((WARN + 1))
    fi
else
    log_warn "Docker not available - skipping container checks"
    WARN=$((WARN + 1))
fi

# --- Summary ---
echo ""
echo "============================================"
echo "  Results"
echo "============================================"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASS"
echo -e "  ${RED}Failed:${NC}   $FAIL"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "  ${RED}Health check FAILED${NC}"
    echo "  Run 'docker compose -f docker-compose.prod.yml logs' to investigate."
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "  ${YELLOW}Health check PASSED with warnings${NC}"
    exit 0
else
    echo -e "  ${GREEN}All checks PASSED${NC}"
    exit 0
fi
