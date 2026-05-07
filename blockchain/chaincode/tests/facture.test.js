'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests unitaires — FactureChain Chaincode
 * Framework : Jest
 * Lancement : npm test (dans /chaincode)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const FactureChaincode = require('../chaincode/facture');

// ─── Mock du Context Fabric ───────────────────────────────────────────────────
class MockContext {
  constructor() {
    this._state = {};
    this.stub = {
      putState: async (key, value) => {
        this._state[key] = value;
      },
      getState: async (key) => {
        return this._state[key] || null;
      },
      deleteState: async (key) => {
        delete this._state[key];
      },
      getStateByRange: async (start, end) => {
        const keys = Object.keys(this._state);
        let idx = 0;
        return {
          next: async () => {
            if (idx < keys.length) {
              const key = keys[idx++];
              return {
                done: false,
                value: { value: this._state[key] }
              };
            }
            return { done: true };
          },
          close: async () => {}
        };
      },
      setEvent: async () => {}
    };
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('FactureChaincode', () => {
  let contract;
  let ctx;

  beforeEach(() => {
    contract = new FactureChaincode();
    ctx = new MockContext();
  });

  // ── initLedger ──────────────────────────────────────────────────────────────
  test('initLedger doit créer une facture initiale', async () => {
    await contract.initLedger(ctx);
    const data = await ctx.stub.getState('F2026-000');
    expect(data).toBeTruthy();
    const facture = JSON.parse(data.toString());
    expect(facture.id).toBe('F2026-000');
    expect(facture.hash).toBeDefined();
    expect(facture.typeDocument).toBe('FACTURE_ENERGIE_ENEO');
  });

  // ── enregistrerFacture ──────────────────────────────────────────────────────
  test('enregistrerFacture doit stocker la facture avec un hash', async () => {
    const result = await contract.enregistrerFacture(
      ctx, 'F2026-001', 'ENEO-CLI-001', '25000', '312', '2026-05', 'Domestique'
    );
    const facture = JSON.parse(result);

    expect(facture.id).toBe('F2026-001');
    expect(facture.montant).toBe(25000);
    expect(facture.hash).toHaveLength(64); // SHA-256 = 64 caractères hex
    expect(facture.statut).toBe('VALIDE');
  });

  test('enregistrerFacture doit rejeter un doublon', async () => {
    await contract.enregistrerFacture(
      ctx, 'F2026-001', 'ENEO-CLI-001', '25000', '312', '2026-05', 'Domestique'
    );
    await expect(
      contract.enregistrerFacture(
        ctx, 'F2026-001', 'ENEO-CLI-001', '25000', '312', '2026-05', 'Domestique'
      )
    ).rejects.toThrow('existe déjà');
  });

  // ── verifierFacture ─────────────────────────────────────────────────────────
  test('verifierFacture doit retourner la facture existante', async () => {
    await contract.enregistrerFacture(
      ctx, 'F2026-002', 'ENEO-CLI-002', '50000', '625', '2026-05', 'Commercial'
    );
    const result = await contract.verifierFacture(ctx, 'F2026-002');
    const facture = JSON.parse(result);
    expect(facture.id).toBe('F2026-002');
    expect(facture.client).toBe('ENEO-CLI-002');
  });

  test('verifierFacture doit lever une erreur si introuvable', async () => {
    await expect(
      contract.verifierFacture(ctx, 'F9999-XXX')
    ).rejects.toThrow('introuvable');
  });

  // ── verifierIntegrite ───────────────────────────────────────────────────────
  test('verifierIntegrite doit confirmer une facture non altérée', async () => {
    await contract.enregistrerFacture(
      ctx, 'F2026-003', 'ENEO-CLI-003', '75000', '937', '2026-05', 'Industriel'
    );
    const result = await contract.verifierIntegrite(
      ctx, 'F2026-003', 'ENEO-CLI-003', '75000', '937', '2026-05', 'Industriel'
    );
    const verification = JSON.parse(result);
    expect(verification.integrite).toBe(true);
    expect(verification.hashBlockchain).toBe(verification.hashRecalcule);
  });

  test('verifierIntegrite doit détecter une facture altérée', async () => {
    await contract.enregistrerFacture(
      ctx, 'F2026-004', 'ENEO-CLI-004', '30000', '375', '2026-05', 'Domestique'
    );
    // Montant modifié (fraude)
    const result = await contract.verifierIntegrite(
      ctx, 'F2026-004', 'ENEO-CLI-004', '99999', '375', '2026-05', 'Domestique'
    );
    const verification = JSON.parse(result);
    expect(verification.integrite).toBe(false);
    expect(verification.hashBlockchain).not.toBe(verification.hashRecalcule);
  });

  // ── annulerFacture ──────────────────────────────────────────────────────────
  test('annulerFacture doit changer le statut à ANNULEE', async () => {
    await contract.enregistrerFacture(
      ctx, 'F2026-005', 'ENEO-CLI-005', '12000', '150', '2026-05', 'Domestique'
    );
    const result = await contract.annulerFacture(ctx, 'F2026-005', 'Erreur de facturation');
    const facture = JSON.parse(result);
    expect(facture.statut).toBe('ANNULEE');
    expect(facture.motifAnnulation).toBe('Erreur de facturation');
  });

  // ── supprimerFacture ────────────────────────────────────────────────────────
  test('supprimerFacture doit supprimer la facture du ledger', async () => {
    await contract.enregistrerFacture(
      ctx, 'F2026-006', 'ENEO-CLI-006', '8000', '100', '2026-05', 'Domestique'
    );
    await contract.supprimerFacture(ctx, 'F2026-006');
    const data = await ctx.stub.getState('F2026-006');
    expect(data).toBeNull();
  });

  // ── hash deterministe ───────────────────────────────────────────────────────
  test('le hash doit être déterministe pour les mêmes données', async () => {
    const result1 = await contract.enregistrerFacture(
      ctx, 'F2026-007', 'CLI-A', '1000', '10', '2026-05', 'Domestique'
    );
    const facture1 = JSON.parse(result1);

    // Recalcul manuel
    const ctx2 = new MockContext();
    const result2 = await contract.enregistrerFacture(
      ctx2, 'F2026-007', 'CLI-A', '1000', '10', '2026-05', 'Domestique'
    );
    const facture2 = JSON.parse(result2);

    expect(facture1.hash).toBe(facture2.hash);
  });
});
