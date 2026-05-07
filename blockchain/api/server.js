'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FactureChain — API REST Gateway
 * Node.js / Express
 *
 * Expose les fonctions du chaincode via une API HTTP
 * Port : 3000
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const crypto = require('crypto');

const { getContract, closeGateway } = require('./fabric');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Utilitaire : calcul hash SHA-256 ─────────────────────────────────────────
function genererHash(factureObj) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(factureObj))
    .digest('hex');
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'FactureChain API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    chaincode: 'facture_v1',
    channel: 'mychannel'
  });
});

// ─── POST /facture — Enregistrer une facture ───────────────────────────────────
/**
 * Body JSON :
 * {
 *   "id": "F2026-001",
 *   "client": "ENEO-CLI-00142",
 *   "montant": 25000,
 *   "kwh": 312,
 *   "periode": "2026-05",
 *   "type": "Domestique"
 * }
 */
app.post('/facture', async (req, res) => {
  try {
    const { id, client, montant, kwh, periode, type } = req.body;

    // Validation des champs requis
    if (!id || !montant) {
      return res.status(400).json({
        erreur: 'Les champs id et montant sont requis.'
      });
    }

    // Calcul du hash local pour vérification
    const factureObj = {
      id,
      client: client || '',
      montant: parseInt(montant),
      kwh: parseInt(kwh) || 0,
      periode: periode || new Date().toISOString().substring(0, 7),
      type: type || 'Domestique'
    };
    const hashLocal = genererHash(factureObj);

    // Soumission au chaincode
    const contract = await getContract();
    const result = await contract.submitTransaction(
      'enregistrerFacture',
      factureObj.id,
      factureObj.client,
      factureObj.montant.toString(),
      factureObj.kwh.toString(),
      factureObj.periode,
      factureObj.type
    );

    const facture = JSON.parse(result.toString());

    res.status(201).json({
      message: 'Facture enregistrée avec succès sur la blockchain.',
      id,
      hash: hashLocal,
      facture,
      txId: contract.txId || 'N/A',
      channel: 'mychannel',
      chaincode: 'facture_v1'
    });

  } catch (err) {
    console.error('[API] Erreur enregistrement :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ─── GET /facture/:id — Consulter une facture ─────────────────────────────────
app.get('/facture/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await getContract();
    const result = await contract.evaluateTransaction('verifierFacture', id);
    const facture = JSON.parse(result.toString());

    res.json({
      message: 'Facture trouvée sur le ledger.',
      facture
    });

  } catch (err) {
    if (err.message.includes('introuvable')) {
      return res.status(404).json({ erreur: err.message });
    }
    console.error('[API] Erreur consultation :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ─── POST /facture/:id/verifier — Vérifier l'intégrité ────────────────────────
/**
 * Body JSON : mêmes champs que lors de l'enregistrement
 * Compare le hash recalculé avec celui stocké sur la blockchain
 */
app.post('/facture/:id/verifier', async (req, res) => {
  try {
    const { id } = req.params;
    const { client, montant, kwh, periode, type } = req.body;

    const contract = await getContract();
    const result = await contract.evaluateTransaction(
      'verifierIntegrite',
      id,
      client || '',
      (parseInt(montant) || 0).toString(),
      (parseInt(kwh) || 0).toString(),
      periode || '',
      type || ''
    );

    const verification = JSON.parse(result.toString());

    res.json({
      message: verification.message,
      integrite: verification.integrite,
      details: verification
    });

  } catch (err) {
    console.error('[API] Erreur vérification :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ─── GET /factures — Lister toutes les factures ───────────────────────────────
app.get('/factures', async (req, res) => {
  try {
    const contract = await getContract();
    const result = await contract.evaluateTransaction('listerFactures');
    const factures = JSON.parse(result.toString());

    res.json({
      total: factures.length,
      factures
    });

  } catch (err) {
    console.error('[API] Erreur listing :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ─── GET /facture/:id/historique — Historique d'une facture ──────────────────
app.get('/facture/:id/historique', async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await getContract();
    const result = await contract.evaluateTransaction('historiqueFacture', id);
    const historique = JSON.parse(result.toString());

    res.json({ id, historique });

  } catch (err) {
    console.error('[API] Erreur historique :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ─── DELETE /facture/:id — Annuler une facture ────────────────────────────────
app.delete('/facture/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const contract = await getContract();
    await contract.submitTransaction(
      'annulerFacture',
      id,
      motif || 'Annulation administrative'
    );

    res.json({
      message: `Facture ${id} annulée avec succès.`,
      id
    });

  } catch (err) {
    console.error('[API] Erreur annulation :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ─── Démarrage serveur ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ┌────────────────────────────────────────┐');
  console.log('  │  FactureChain API — ENEO Cameroun      │');
  console.log(`  │  Écoute sur http://localhost:${PORT}      │`);
  console.log('  │  Channel : mychannel                   │');
  console.log('  │  Chaincode : facture_v1                │');
  console.log('  └────────────────────────────────────────┘');
  console.log('');
});

// Fermeture propre du gateway Fabric
process.on('SIGINT', async () => {
  await closeGateway();
  process.exit(0);
});

module.exports = app;
