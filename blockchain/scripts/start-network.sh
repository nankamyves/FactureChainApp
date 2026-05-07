#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# start-network.sh — Démarre le réseau Hyperledger Fabric FactureChain
# ─────────────────────────────────────────────────────────────────────────────

set -e

NETWORK_DIR="$(cd "$(dirname "$0")/../network" && pwd)"
CHAINCODE_DIR="$(cd "$(dirname "$0")/../chaincode" && pwd)"

echo ""
echo "  ┌────────────────────────────────────────────────────────┐"
echo "  │         FactureChain — Démarrage du réseau             │"
echo "  │         Hyperledger Fabric 2.4 — ENEO Cameroun         │"
echo "  └────────────────────────────────────────────────────────┘"
echo ""

cd "$NETWORK_DIR"

# ── Étape 1 : Vérifications préalables ──────────────────────────────────────
echo "[ 1/6 ] Vérification des prérequis..."
command -v docker     >/dev/null 2>&1 || { echo "ERREUR : Docker requis."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "ERREUR : docker-compose requis."; exit 1; }

FABRIC_VERSION="2.4"
echo "       Docker        : OK ($(docker --version | cut -d' ' -f3 | tr -d ','))"
echo "       Fabric cible  : $FABRIC_VERSION"

# ── Étape 2 : Pull des images Fabric ─────────────────────────────────────────
echo ""
echo "[ 2/6 ] Téléchargement des images Hyperledger Fabric..."
docker pull hyperledger/fabric-peer:2.4    2>/dev/null || echo "  (déjà présente)"
docker pull hyperledger/fabric-orderer:2.4 2>/dev/null || echo "  (déjà présente)"
docker pull hyperledger/fabric-tools:2.4   2>/dev/null || echo "  (déjà présente)"
docker pull couchdb:3.1.1                  2>/dev/null || echo "  (déjà présente)"

# ── Étape 3 : Génération des certificats MSP ─────────────────────────────────
echo ""
echo "[ 3/6 ] Génération des certificats MSP (cryptogen)..."
if [ ! -d "./crypto-config" ]; then
  if command -v cryptogen >/dev/null 2>&1; then
    cryptogen generate --config=./crypto-config.yaml
    echo "       Certificats générés dans ./crypto-config"
  else
    echo "       AVERTISSEMENT : cryptogen non trouvé."
    echo "       Téléchargez les binaires Fabric : https://github.com/hyperledger/fabric/releases"
    echo "       Ou utilisez le script officiel : curl -sSL https://bit.ly/2ysbOFE | bash -s"
    mkdir -p crypto-config
  fi
else
  echo "       Certificats déjà présents — skip."
fi

# ── Étape 4 : Génération du bloc genesis et du channel ───────────────────────
echo ""
echo "[ 4/6 ] Génération du bloc genesis et du channel..."
mkdir -p channel-artifacts
if [ ! -f "./channel-artifacts/genesis.block" ]; then
  if command -v configtxgen >/dev/null 2>&1; then
    export FABRIC_CFG_PATH="$NETWORK_DIR"
    configtxgen -profile FactureChainGenesis \
      -channelID system-channel \
      -outputBlock ./channel-artifacts/genesis.block
    configtxgen -profile FactureChainChannel \
      -outputCreateChannelTx ./channel-artifacts/mychannel.tx \
      -channelID mychannel
    echo "       Blocs générés dans ./channel-artifacts"
  else
    echo "       AVERTISSEMENT : configtxgen non trouvé — skip."
    touch channel-artifacts/genesis.block
  fi
else
  echo "       Blocs déjà présents — skip."
fi

# ── Étape 5 : Démarrage des conteneurs Docker ─────────────────────────────────
echo ""
echo "[ 5/6 ] Démarrage des conteneurs Docker..."
docker-compose -f docker-compose.yaml up -d

echo ""
echo "       Attente démarrage des services (10s)..."
sleep 10

# ── Étape 6 : Création du channel ────────────────────────────────────────────
echo ""
echo "[ 6/6 ] Création et jointure du channel 'mychannel'..."
docker exec cli peer channel create \
  -o orderer.eneo.com:7050 \
  -c mychannel \
  -f ./channel-artifacts/mychannel.tx 2>/dev/null || echo "  (channel peut-être déjà créé)"

docker exec cli peer channel join \
  -b mychannel.block 2>/dev/null || echo "  (peer déjà sur le channel)"

echo ""
echo "  ✓ Réseau FactureChain démarré avec succès !"
echo ""
echo "  Statut des conteneurs :"
docker ps --format "  {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "orderer|peer|couchdb|cli"
echo ""
echo "  Prochaine étape : ./deploy-chaincode.sh"
echo ""
