'use strict';

const FactureChaincode = require('./facture');
const { Contract } = require('fabric-contract-api');

module.exports.FactureChaincode = FactureChaincode;
module.exports.contracts = [FactureChaincode];
