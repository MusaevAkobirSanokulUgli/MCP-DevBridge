#!/bin/bash
# ============================================================
# MCP DevBridge - Production Deployment Script
# Validates environment, builds images, and starts all services
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================"
echo "  MCP DevBridge - Production Deployment"
echo "============================================"
echo ""

# --- Step 1: Validate prerequisites ---
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi
log_ok "Docker is installed"

if ! command -v docker compose &> /dev/null; then
    # Fallback to docker-compose (v1)
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi
log_ok "Docker Compose is available"

if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker."
    exit 1
fi
log_ok "Docker daemon is running"

# --- Step 2: Validate environment file ---
log_info "Checking environment configuration..."

if [ ! -f "$ENV_FILE" ]; then
    log_error ".env.production not found at: $ENV_FILE"
    log_info "Copy .env.example to .env.production and fill in values:"
    log_info "  cp $PROJECT_ROOT/.env.example $PROJECT_ROOT/.env.production"
    exit 1
fi
log_ok ".env.production found"

# Source env file and validate required vars
set -a
source "$ENV_FILE"
set +a

if [ -z "${GITHUB_TOKEN:-}" ] || [ "$GITHUB_TOKEN" = "your_github_token_here" ]; then
    log_warn "GITHUB_TOKEN is not set or is a placeholder."
    log_warn "GitHub MCP server will run with limited functionality."
    echo ""
    read -p "Continue anyway? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled. Set GITHUB_TOKEN in .env.production"
        exit 0
    fi
fi

# --- Step 3: Build images ---
echo ""
log_info "Building Docker images (this may take a few minutes)..."
cd "$PROJECT_ROOT"

$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel

log_ok "All images built successfully"

# --- Step 4: Stop existing containers ---
log_info "Stopping existing containers (if any)..."
$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans 2>/dev/null || true
log_ok "Previous containers stopped"

# --- Step 5: Start services ---
echo ""
log_info "Starting all services..."
$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

log_ok "All services started"

# --- Step 6: Wait for health checks ---
echo ""
log_info "Waiting for services to become healthy..."

MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    UNHEALTHY=$($COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null | \
        grep -c '"starting"\|"unhealthy"' 2>/dev/null || echo "0")

    if [ "$UNHEALTHY" = "0" ]; then
        break
    fi

    echo -ne "\r  Waiting... ${ELAPSED}s / ${MAX_WAIT}s"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""

# --- Step 7: Show status ---
echo ""
echo "============================================"
echo "  Deployment Status"
echo "============================================"
echo ""

$COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

PUBLIC_PORT="${PUBLIC_PORT:-80}"
echo ""
echo "============================================"
echo "  Access Points"
echo "============================================"
echo ""
log_ok "Frontend:    http://localhost:${PUBLIC_PORT}"
log_ok "API:         http://localhost:${PUBLIC_PORT}/api/health"
log_ok "Swagger:     http://localhost:${PUBLIC_PORT}/swagger"
log_ok "SignalR Hub: http://localhost:${PUBLIC_PORT}/hubs/dashboard"
echo ""
log_info "Run health check: bash $SCRIPT_DIR/health-check.sh"
log_info "View logs:        $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
log_info "Stop services:    $COMPOSE_CMD -f $COMPOSE_FILE down"
echo ""
