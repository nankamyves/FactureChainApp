'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FactureChain — Smart Contract (Chaincode)
 * Hyperledger Fabric 2.4 / Node.js
 *
 * Système de traçabilité et vérification d'intégrité des factures ENEO Cameroun
 * Auteur : Projet FactureChain
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class FactureChaincode extends Contract {

  constructor() {
    super('FactureChaincode');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Initialisation du ledger avec quelques données de test
  // ──────────────────────────────────────────────────────────────────────────
  async initLedger(ctx) {
    console.log('============= FactureChain : Initialisation du ledger ===========');

    const facturesInitiales = [
      {
        id: 'F2026-000',
        client: 'ENEO-CLI-00001',
        montant: 15000,
        kwh: 187,
        periode: '2026-01',
        type: 'Domestique',
        statut: 'VALIDE'
      }
    ];

    for (const facture of facturesInitiales) {
      const hash = this._calculerHash(facture);
      const enregistrement = {
        ...facture,
        hash,
        dateEnregistrement: new Date().toISOString(),
        typeDocument: 'FACTURE_ENERGIE_ENEO'
      };
      await ctx.stub.putState(
        facture.id,
        Buffer.from(JSON.stringify(enregistrement))
      );
      console.log(`Facture ${facture.id} enregistrée avec hash ${hash}`);
    }

    console.log('============= Ledger initialisé avec succès =============');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Enregistrer une nouvelle facture sur la blockchain
  // Params : id, client, montant, kwh, periode, type
  // ──────────────────────────────────────────────────────────────────────────
  async enregistrerFacture(ctx, id, client, montant, kwh, periode, type) {
    console.log(`[FactureChain] Enregistrement facture : ${id}`);

    // Vérifier que la facture n'existe pas déjà
    const existant = await ctx.stub.getState(id);
    if (existant && existant.length > 0) {
      throw new Error(`Erreur : la facture ${id} existe déjà sur le ledger.`);
    }

    const factureObj = {
      id,
      client,
      montant: parseInt(montant),
      kwh: parseInt(kwh),
      periode,
      type
    };

    const hash = this._calculerHash(factureObj);

    const enregistrement = {
      ...factureObj,
      hash,
      dateEnregistrement: new Date().toISOString(),
      typeDocument: 'FACTURE_ENERGIE_ENEO',
      statut: 'VALIDE',
      version: 1
    };

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(enregistrement)));

    // Émettre un événement blockchain
    await ctx.stub.setEvent('FactureEnregistree', Buffer.from(JSON.stringify({
      id,
      hash,
      timestamp: enregistrement.dateEnregistrement
    })));

    console.log(`[FactureChain] Facture ${id} enregistrée. Hash : ${hash}`);
    return JSON.stringify(enregistrement);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Vérifier une facture — retourne les données du ledger
  // ──────────────────────────────────────────────────────────────────────────
  async verifierFacture(ctx, id) {
    console.log(`[FactureChain] Vérification facture : ${id}`);

    const data = await ctx.stub.getState(id);

    if (!data || data.length === 0) {
      throw new Error(`Facture ${id} introuvable sur le ledger.`);
    }

    const facture = JSON.parse(data.toString());
    console.log(`[FactureChain] Facture trouvée : ${JSON.stringify(facture)}`);
    return data.toString();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Vérifier l'intégrité d'une facture (recalcul du hash)
  // ──────────────────────────────────────────────────────────────────────────
  async verifierIntegrite(ctx, id, client, montant, kwh, periode, type) {
    console.log(`[FactureChain] Vérification intégrité : ${id}`);

    const data = await ctx.stub.getState(id);
    if (!data || data.length === 0) {
      throw new Error(`Facture ${id} introuvable sur le ledger.`);
    }

    const factureStockee = JSON.parse(data.toString());

    // Recalcul du hash avec les données fournies
    const factureAVerifier = {
      id,
      client,
      montant: parseInt(montant),
      kwh: parseInt(kwh),
      periode,
      type
    };

    const hashRecalcule = this._calculerHash(factureAVerifier);
    const integrite = hashRecalcule === factureStockee.hash;

    const resultat = {
      id,
      integrite,
      hashBlockchain: factureStockee.hash,
      hashRecalcule,
      message: integrite
        ? 'FACTURE VALIDE — Hash identique, aucune altération détectée'
        : 'FRAUDE DÉTECTÉE — Les hash ne correspondent pas'
    };

    console.log(`[FactureChain] Résultat intégrité : ${JSON.stringify(resultat)}`);
    return JSON.stringify(resultat);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lister toutes les factures (requête CouchDB rich query)
  // ──────────────────────────────────────────────────────────────────────────
  async listerFactures(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const factures = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const facture = JSON.parse(res.value.value.toString('utf8'));
          if (facture.typeDocument === 'FACTURE_ENERGIE_ENEO') {
            factures.push(facture);
          }
        } catch (err) {
          console.log(`[FactureChain] Erreur parsing : ${err}`);
        }
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(factures);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Historique complet d'une facture (toutes les versions)
  // ──────────────────────────────────────────────────────────────────────────
  async historiqueFacture(ctx, id) {
    const iterator = await ctx.stub.getHistoryForKey(id);
    const historique = [];

    while (true) {
      const res = await iterator.next();
      if (res.value) {
        const entry = {
          txId: res.value.txId,
          timestamp: res.value.timestamp,
          isDelete: res.value.isDelete,
          valeur: res.value.value.toString('utf8')
        };
        historique.push(entry);
      }
      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(historique);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Marquer une facture comme annulée (soft delete)
  // ──────────────────────────────────────────────────────────────────────────
  async annulerFacture(ctx, id, motif) {
    const data = await ctx.stub.getState(id);
    if (!data || data.length === 0) {
      throw new Error(`Facture ${id} introuvable.`);
    }

    const facture = JSON.parse(data.toString());
    facture.statut = 'ANNULEE';
    facture.motifAnnulation = motif;
    facture.dateAnnulation = new Date().toISOString();

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(facture)));
    return JSON.stringify(facture);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Suppression définitive d'une facture (hard delete)
  // ──────────────────────────────────────────────────────────────────────────
  async supprimerFacture(ctx, id) {
    const data = await ctx.stub.getState(id);
    if (!data || data.length === 0) {
      throw new Error(`Facture ${id} introuvable.`);
    }

    await ctx.stub.deleteState(id);
    console.log(`[FactureChain] Facture ${id} supprimée du world state.`);
    return JSON.stringify({ message: `Facture ${id} supprimée avec succès.` });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Méthode privée : calcul SHA-256 du contenu de la facture
  // ──────────────────────────────────────────────────────────────────────────
  _calculerHash(factureObj) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(factureObj))
      .digest('hex');
  }
}

module.exports = FactureChaincode;
