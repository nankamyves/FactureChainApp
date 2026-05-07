#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# test-api.sh — Tests de l'API FactureChain via curl
# Prérequis : API démarrée sur port 3000
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL="http://localhost:3000"

echo ""
echo "  ┌──────────────────────────────────────────────────┐"
echo "  │     FactureChain — Tests API REST               │"
echo "  └──────────────────────────────────────────────────┘"
echo ""

# ── Test 1 : Health check ────────────────────────────────────────────────────
echo "[ TEST 1 ] Health check..."
curl -s "${BASE_URL}/health" | python3 -m json.tool
echo ""

# ── Test 2 : Enregistrer une facture ─────────────────────────────────────────
echo "[ TEST 2 ] Enregistrement d'une facture..."
curl -s -X POST "${BASE_URL}/facture" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "F2026-TEST-001",
    "client": "ENEO-CLI-00142",
    "montant": 25000,
    "kwh": 312,
    "periode": "2026-05",
    "type": "Domestique"
  }' | python3 -m json.tool
echo ""

# ── Test 3 : Consulter la facture ─────────────────────────────────────────────
echo "[ TEST 3 ] Consultation facture F2026-TEST-001..."
curl -s "${BASE_URL}/facture/F2026-TEST-001" | python3 -m json.tool
echo ""

# ── Test 4 : Vérification intégrité (données identiques) ─────────────────────
echo "[ TEST 4 ] Vérification intégrité (données valides)..."
curl -s -X POST "${BASE_URL}/facture/F2026-TEST-001/verifier" \
  -H "Content-Type: application/json" \
  -d '{
    "client": "ENEO-CLI-00142",
    "montant": 25000,
    "kwh": 312,
    "periode": "2026-05",
    "type": "Domestique"
  }' | python3 -m json.tool
echo ""

# ── Test 5 : Vérification intégrité (données altérées) ───────────────────────
echo "[ TEST 5 ] Vérification intégrité (données ALTÉRÉES — montant modifié)..."
curl -s -X POST "${BASE_URL}/facture/F2026-TEST-001/verifier" \
  -H "Content-Type: application/json" \
  -d '{
    "client": "ENEO-CLI-00142",
    "montant": 99999,
    "kwh": 312,
    "periode": "2026-05",
    "type": "Domestique"
  }' | python3 -m json.tool
echo ""

# ── Test 6 : Lister toutes les factures ──────────────────────────────────────
echo "[ TEST 6 ] Liste de toutes les factures..."
curl -s "${BASE_URL}/factures" | python3 -m json.tool
echo ""

echo "  ✓ Tests terminés."
echo ""
