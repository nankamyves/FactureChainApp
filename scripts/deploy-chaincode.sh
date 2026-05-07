#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# deploy-chaincode.sh — Déploie le smart contract FactureChain
# Hyperledger Fabric 2.4 — Lifecycle Chaincode
# ─────────────────────────────────────────────────────────────────────────────

set -e

CHAINCODE_NAME="facture"
CHAINCODE_VERSION="1.0"
CHAINCODE_LABEL="${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
CHANNEL_NAME="mychannel"
SEQUENCE="1"

echo ""
echo "  ┌────────────────────────────────────────────────────────┐"
echo "  │         FactureChain — Déploiement Chaincode           │"
echo "  │         ${CHAINCODE_LABEL} sur ${CHANNEL_NAME}                    │"
echo "  └────────────────────────────────────────────────────────┘"
echo ""

# ── Étape 1 : Installer les dépendances npm du chaincode ─────────────────────
echo "[ 1/5 ] Installation des dépendances npm du chaincode..."
(cd ../chaincode && npm install --silent)
echo "       node_modules installés."

# ── Étape 2 : Packaging du chaincode ─────────────────────────────────────────
echo ""
echo "[ 2/5 ] Packaging du chaincode..."
docker exec cli peer lifecycle chaincode package \
  /tmp/${CHAINCODE_LABEL}.tar.gz \
  --path /opt/gopath/src/github.com/chaincode \
  --lang node \
  --label ${CHAINCODE_LABEL}
echo "       Package créé : ${CHAINCODE_LABEL}.tar.gz"

# ── Étape 3 : Installation sur le peer ───────────────────────────────────────
echo ""
echo "[ 3/5 ] Installation du chaincode sur peer0.eneo.com..."
docker exec cli peer lifecycle chaincode install \
  /tmp/${CHAINCODE_LABEL}.tar.gz

# Récupérer le Package ID
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled \
  --output json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['installed_chaincodes'][0]['package_id'])" 2>/dev/null \
  || echo "${CHAINCODE_LABEL}:unknown")

echo "       Package ID : ${PACKAGE_ID}"

# ── Étape 4 : Approbation de la définition ────────────────────────────────────
echo ""
echo "[ 4/5 ] Approbation de la définition du chaincode (EneoMSP)..."
docker exec cli peer lifecycle chaincode approveformyorg \
  -o orderer.eneo.com:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${CHAINCODE_VERSION} \
  --package-id "${PACKAGE_ID}" \
  --sequence ${SEQUENCE}
echo "       Approuvé par EneoMSP."

# ── Étape 5 : Commit de la définition ────────────────────────────────────────
echo ""
echo "[ 5/5 ] Commit de la définition sur le channel..."
docker exec cli peer lifecycle chaincode commit \
  -o orderer.eneo.com:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${CHAINCODE_VERSION} \
  --sequence ${SEQUENCE}
echo "       Chaincode engagé sur ${CHANNEL_NAME}."

# ── Initialisation du ledger ──────────────────────────────────────────────────
echo ""
echo "[ + ] Initialisation du ledger (initLedger)..."
docker exec cli peer chaincode invoke \
  -o orderer.eneo.com:7050 \
  -C ${CHANNEL_NAME} \
  -n ${CHAINCODE_NAME} \
  --isInit \
  -c '{"function":"initLedger","Args":[]}' 2>/dev/null || echo "  (initLedger optionnel)"

echo ""
echo "  ✓ Chaincode '${CHAINCODE_NAME}' déployé avec succès !"
echo ""
echo "  Tester l'enregistrement :"
echo "  docker exec cli peer chaincode invoke -o orderer.eneo.com:7050 \\"
echo "    -C mychannel -n facture \\"
echo "    -c '{\"function\":\"enregistrerFacture\",\"Args\":[\"F2026-TEST\",\"CLI-001\",\"25000\",\"312\",\"2026-05\",\"Domestique\"]}'"
echo ""
echo "  Prochaine étape : cd ../api && npm install && npm start"
echo ""
