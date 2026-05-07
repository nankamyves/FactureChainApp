#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# stop-network.sh — Arrête et nettoie le réseau FactureChain
# ─────────────────────────────────────────────────────────────────────────────

NETWORK_DIR="$(cd "$(dirname "$0")/../network" && pwd)"

echo ""
echo "  Arrêt du réseau FactureChain..."
echo ""

cd "$NETWORK_DIR"

docker-compose -f docker-compose.yaml down --volumes --remove-orphans

# Nettoyer les images de chaincode
docker images -q "dev-peer*facture*" 2>/dev/null | xargs -r docker rmi -f
docker images -q "dev-peer*" 2>/dev/null | xargs -r docker rmi -f

# Nettoyer les volumes résiduels
docker volume prune -f 2>/dev/null

echo ""
echo "  ✓ Réseau arrêté et nettoyé."
echo ""
