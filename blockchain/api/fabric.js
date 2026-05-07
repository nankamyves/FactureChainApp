'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FactureChain — Fabric Gateway
 * Connexion au réseau Hyperledger Fabric via le SDK fabric-network
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

// ─── Configuration ────────────────────────────────────────────────────────────
const CHANNEL_NAME     = process.env.CHANNEL_NAME     || 'mychannel';
const CHAINCODE_NAME   = process.env.CHAINCODE_NAME   || 'facture';
const MSP_ID           = process.env.MSP_ID           || 'EneoMSP';
const WALLET_PATH      = process.env.WALLET_PATH      || path.join(__dirname, 'wallet');
const CONNECTION_PROFILE_PATH = process.env.CONNECTION_PROFILE_PATH
  || path.join(__dirname, 'connection.json');

let gatewayInstance = null;

// ─── Charger le profil de connexion ──────────────────────────────────────────
function chargerProfilConnexion() {
  if (!fs.existsSync(CONNECTION_PROFILE_PATH)) {
    throw new Error(
      `Profil de connexion introuvable : ${CONNECTION_PROFILE_PATH}\n` +
      `Assurez-vous que le réseau Fabric est démarré et que connection.json existe.`
    );
  }
  const contenu = fs.readFileSync(CONNECTION_PROFILE_PATH, 'utf8');
  return JSON.parse(contenu);
}

// ─── Initialiser le wallet avec une identité admin ───────────────────────────
async function initialiserWallet() {
  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

  // Vérifier si l'identité admin existe déjà
  const identity = await wallet.get('admin');
  if (identity) {
    console.log('[Fabric] Identité admin déjà dans le wallet.');
    return wallet;
  }

  // Charger le certificat et la clé privée admin depuis crypto-config
  const cryptoPath = path.resolve(
    __dirname,
    '..',
    'network',
    'crypto-config',
    'peerOrganizations',
    'eneo.com',
    'users',
    'Admin@eneo.com',
    'msp'
  );

  const certPath   = path.join(cryptoPath, 'signcerts', 'Admin@eneo.com-cert.pem');
  const keyDir     = path.join(cryptoPath, 'keystore');

  if (!fs.existsSync(certPath)) {
    console.warn('[Fabric] Certificat admin introuvable. Utilisation du mode mock.');
    return wallet;
  }

  const cert    = fs.readFileSync(certPath).toString();
  const keyFiles = fs.readdirSync(keyDir);
  const key     = fs.readFileSync(path.join(keyDir, keyFiles[0])).toString();

  const adminIdentity = {
    credentials: { certificate: cert, privateKey: key },
    mspId: MSP_ID,
    type: 'X.509'
  };

  await wallet.put('admin', adminIdentity);
  console.log('[Fabric] Identité admin ajoutée au wallet.');
  return wallet;
}

// ─── Obtenir le contrat chaincode ─────────────────────────────────────────────
async function getContract() {
  if (gatewayInstance) {
    const network  = await gatewayInstance.getNetwork(CHANNEL_NAME);
    return network.getContract(CHAINCODE_NAME);
  }

  const connectionProfile = chargerProfilConnexion();
  const wallet = await initialiserWallet();

  const gateway = new Gateway();

  await gateway.connect(connectionProfile, {
    wallet,
    identity: 'admin',
    discovery: {
      enabled: true,
      asLocalhost: process.env.AS_LOCALHOST !== 'false'
    }
  });

  gatewayInstance = gateway;

  const network  = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);

  console.log(`[Fabric] Connecté au channel "${CHANNEL_NAME}", chaincode "${CHAINCODE_NAME}"`);
  return contract;
}

// ─── Fermer la connexion proprement ──────────────────────────────────────────
async function closeGateway() {
  if (gatewayInstance) {
    gatewayInstance.disconnect();
    gatewayInstance = null;
    console.log('[Fabric] Gateway déconnecté.');
  }
}

module.exports = { getContract, closeGateway };
