# FactureChain — Système de traçabilité des factures ENEO sur Blockchain

> Mémoire de fin d'études — Système de sécurisation des factures d'énergie  
> Réseau : Hyperledger Fabric 2.4 · Chaincode : Node.js · API : Express.js

---

## Table des matières

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Installation rapide](#installation-rapide)
4. [Structure du projet](#structure-du-projet)
5. [API REST — Endpoints](#api-rest)
6. [Smart Contract — Fonctions](#smart-contract)
7. [Exemples d'utilisation](#exemples)

---

## Architecture

```
┌─────────────────┐
│   Client ENEO   │  (navigateur / application mobile)
└────────┬────────┘
         │ HTTP REST
         ▼
┌─────────────────────────────┐
│   API FactureChain          │  Node.js + Express — port 3000
│   POST /facture             │
│   GET  /facture/:id         │
│   POST /facture/:id/verifier│
└────────┬────────────────────┘
         │ fabric-network SDK
         ▼
┌─────────────────────────────────────────┐
│   Hyperledger Fabric Network            │
│                                         │
│   peer0.eneo.com:7051  ←─ Endorsement  │
│   orderer.eneo.com:7050 ← Raft         │
│   couchdb:5984          ← World State  │
│                                         │
│   Channel : mychannel                   │
│   Chaincode : facture_v1               │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│   Blockchain Ledger          │
│   { id, hash SHA-256, date } │
│   Immuable · Traçable        │
└──────────────────────────────┘
```

---

## Prérequis

| Outil | Version | Installation |
|-------|---------|-------------|
| Docker | ≥ 20.x | https://docs.docker.com/get-docker/ |
| docker-compose | ≥ 1.29 | Inclus avec Docker Desktop |
| Node.js | ≥ 14.x | https://nodejs.org |
| npm | ≥ 6.x | Inclus avec Node.js |
| Fabric binaires | 2.4 | `curl -sSL https://bit.ly/2ysbOFE \| bash -s -- 2.4.0` |

---

## Installation rapide

### 1. Cloner / extraire le projet

```bash
unzip facturechain.zip
cd facturechain
```

### 2. Télécharger les binaires Fabric (cryptogen, configtxgen)

```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.0 1.5.0
export PATH=$PATH:$(pwd)/bin
```

### 3. Démarrer le réseau Hyperledger Fabric

```bash
cd scripts
chmod +x *.sh
./start-network.sh
```

### 4. Déployer le smart contract

```bash
./deploy-chaincode.sh
```

### 5. Démarrer l'API

```bash
cd ../api
npm install
npm start
```

### 6. Tester

```bash
cd ../scripts
./test-api.sh
```

Ou ouvrir http://localhost:3000/health dans un navigateur.

---

## Structure du projet

```
facturechain/
│
├── network/
│   ├── docker-compose.yaml      # Conteneurs Fabric (peer, orderer, couchdb, cli)
│   ├── crypto-config.yaml       # Configuration MSP / certificats
│   └── configtx.yaml            # Profils genesis block et channel
│
├── chaincode/
│   ├── facture.js               # Smart contract principal
│   ├── index.js                 # Point d'entrée chaincode
│   └── package.json             # Dépendances fabric-contract-api
│
├── api/
│   ├── server.js                # Serveur Express — routes REST
│   ├── fabric.js                # Connexion Gateway Hyperledger Fabric
│   ├── connection.json          # Profil de connexion au réseau
│   └── package.json             # Dépendances API
│
├── scripts/
│   ├── start-network.sh         # Démarre le réseau Fabric
│   ├── deploy-chaincode.sh      # Package + installe + approuve + commit chaincode
│   ├── stop-network.sh          # Arrête et nettoie tout
│   └── test-api.sh              # Tests curl automatisés
│
├── docs/
│   └── README.md                # Ce fichier
│
└── README.md
```

---

## API REST

### Base URL : `http://localhost:3000`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Statut de l'API |
| `POST` | `/facture` | Enregistrer une facture sur la blockchain |
| `GET` | `/facture/:id` | Consulter une facture depuis le ledger |
| `POST` | `/facture/:id/verifier` | Vérifier l'intégrité d'une facture |
| `GET` | `/factures` | Lister toutes les factures |
| `GET` | `/facture/:id/historique` | Historique des transactions d'une facture |
| `DELETE` | `/facture/:id` | Annuler une facture |

### Exemple : Enregistrement

```http
POST /facture
Content-Type: application/json

{
  "id": "F2026-001",
  "client": "ENEO-CLI-00142",
  "montant": 25000,
  "kwh": 312,
  "periode": "2026-05",
  "type": "Domestique"
}
```

Réponse :

```json
{
  "message": "Facture enregistrée avec succès sur la blockchain.",
  "id": "F2026-001",
  "hash": "a8f5f167f44f4964e6c998dee827110c...",
  "facture": {
    "id": "F2026-001",
    "client": "ENEO-CLI-00142",
    "montant": 25000,
    "hash": "a8f5f167...",
    "dateEnregistrement": "2026-05-06T10:30:00.000Z",
    "statut": "VALIDE"
  }
}
```

### Exemple : Vérification d'intégrité

```http
POST /facture/F2026-001/verifier
Content-Type: application/json

{
  "client": "ENEO-CLI-00142",
  "montant": 25000,
  "kwh": 312,
  "periode": "2026-05",
  "type": "Domestique"
}
```

Réponse (facture valide) :

```json
{
  "integrite": true,
  "message": "FACTURE VALIDE — Hash identique, aucune altération détectée",
  "details": {
    "hashBlockchain": "a8f5f167...",
    "hashRecalcule":  "a8f5f167..."
  }
}
```

Réponse (fraude détectée) :

```json
{
  "integrite": false,
  "message": "FRAUDE DÉTECTÉE — Les hash ne correspondent pas",
  "details": {
    "hashBlockchain": "a8f5f167...",
    "hashRecalcule":  "ff3a21bc..."
  }
}
```

---

## Smart Contract

### Fonctions du chaincode `facture.js`

| Fonction | Type | Description |
|----------|------|-------------|
| `initLedger(ctx)` | Invoke | Initialise le ledger avec des données de test |
| `enregistrerFacture(ctx, id, client, montant, kwh, periode, type)` | Invoke | Enregistre une facture + calcule son hash SHA-256 |
| `verifierFacture(ctx, id)` | Query | Retourne les données d'une facture depuis le ledger |
| `verifierIntegrite(ctx, id, ...)` | Query | Compare hash recalculé vs hash stocké |
| `listerFactures(ctx)` | Query | Retourne toutes les factures du ledger |
| `historiqueFacture(ctx, id)` | Query | Retourne l'historique complet des transactions |
| `annulerFacture(ctx, id, motif)` | Invoke | Marque une facture comme annulée (soft delete) |
| `supprimerFacture(ctx, id)` | Invoke | Suppression définitive du world state |

### Principe de vérification d'intégrité

```
hash(facture_originale)  ==  hash(blockchain)  →  VALIDE
hash(facture_modifiée)   !=  hash(blockchain)  →  FRAUDE
```

Le hash SHA-256 est calculé sur le JSON canonique de la facture :
`{ id, client, montant, kwh, periode, type }`

---

## Arrêt du système

```bash
cd scripts
./stop-network.sh
```

---

## Auteur et contexte

Projet FactureChain — Mémoire de fin d'études  
Sécurisation des factures d'énergie par la technologie blockchain  
Application : ENEO Cameroun S.A.  
Stack : Hyperledger Fabric 2.4 · Node.js · Express · CouchDB · Docker

---

*Licence Apache 2.0 — Voir LICENSE*
