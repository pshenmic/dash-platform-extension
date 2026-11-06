import { PrivateKey, Transaction } from 'dash-core-sdk'
import { CoreWalletUtxo } from '../content-script/services/CoreExplorerService'
import { NetworkType } from '../types/NetworkType'
import { buildCoreTransfer, estimateCoreFee } from './coreTransfer'

export interface FundingAddressRecovery {
  transaction: Transaction
  txid: string
  amountDuffs: bigint
  feeDuffs: bigint
  inputs: CoreWalletUtxo[]
}

/**
 * Drains an asset lock funding address into a single destination output.
 *
 * A plain L1 P2PKH sweep: the funding address is an ordinary Core address and
 * its key is held by this extension, so no Platform transition and no asset lock
 * is involved. Pure - fee and signing only, with the UTXOs and the key handed in,
 * so the shape of the transaction can be asserted without a network.
 *
 * Always a full sweep. Every output is spent into one recipient output and the
 * fee comes out of the total, so nothing is left at the address and the entry can
 * be closed out. A partial spend is not offered: these addresses exist to fund
 * one asset lock, and leaving change behind keeps an entry alive that the wallet
 * has no other reason to come back to.
 */
export const buildFundingAddressRecovery = (
  utxos: CoreWalletUtxo[],
  toAddress: string,
  fundingAddress: string,
  privateKeyWif: string,
  network: NetworkType
): FundingAddressRecovery => {
  if (utxos.length === 0) {
    throw new Error(`Asset lock funding address ${fundingAddress} has no unspent outputs`)
  }

  const totalIn = utxos.reduce((sum, utxo) => sum + utxo.amount, 0n)
  const fee = estimateCoreFee(utxos.length, 1)
  const amount = totalIn - fee

  if (amount <= 0n) {
    throw new Error(
      `Asset lock funding address ${fundingAddress} holds ${totalIn.toString()} duffs, ` +
      `which does not cover the ${fee.toString()} duff fee to spend it`
    )
  }

  // The change address is never used: a sweep pays out exactly what is left after
  // the fee, so buildCoreTransfer is handed 0n and produces one output.
  const transaction = buildCoreTransfer(
    utxos,
    [{ address: toAddress, amountDuffs: amount }],
    fundingAddress,
    0n,
    network
  )

  transaction.sign(PrivateKey.fromWIF(privateKeyWif))

  // Refuse to hand back a transaction that does not balance, whatever the fee
  // model above decided - the network would reject it with no local cause.
  if (amount + fee !== totalIn) {
    throw new Error(
      `Refusing to broadcast a recovery that does not balance: ${totalIn.toString()} in, ` +
      `${amount.toString()} out plus ${fee.toString()} fee`
    )
  }

  return {
    transaction,
    txid: transaction.hash(),
    amountDuffs: amount,
    feeDuffs: fee,
    inputs: utxos
  }
}
