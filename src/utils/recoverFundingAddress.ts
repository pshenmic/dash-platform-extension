import { PrivateKey, Transaction } from 'dash-core-sdk'
import { CoreWalletUtxo } from '../content-script/services/CoreExplorerService'
import { NetworkType } from '../types/NetworkType'
import { buildCoreTransfer, estimateCoreFee, maxCoreSpend, selectCoreUtxos } from './coreTransfer'

export interface FundingAddressRecovery {
  transaction: Transaction
  txid: string
  amountDuffs: bigint
  feeDuffs: bigint
  changeDuffs: bigint
  inputs: CoreWalletUtxo[]
  // True when nothing is left at the funding address, so the caller can close
  // the entry out rather than keep offering it.
  swept: boolean
}

/**
 * Spends the unspent outputs of an asset lock funding address to a destination.
 *
 * A plain L1 P2PKH sweep: the funding address is an ordinary Core address and
 * its key is held by this extension, so no Platform transition and no asset lock
 * is involved. Pure - coin selection, fee and signing only, with the UTXOs and
 * the key handed in, so the shape of the transaction can be asserted without a
 * network.
 *
 * With no `amountDuffs` this drains the address: every output is spent into one
 * recipient output and the fee comes out of the total, which is what
 * `maxCoreSpend` computes. Otherwise coins are selected for the amount asked and
 * the remainder goes back to the funding address itself - this extension holds
 * its key, so the leftover stays recoverable instead of being stranded somewhere
 * nothing can sign for.
 */
export const buildFundingAddressRecovery = (
  utxos: CoreWalletUtxo[],
  toAddress: string,
  fundingAddress: string,
  privateKeyWif: string,
  network: NetworkType,
  amountDuffs?: bigint
): FundingAddressRecovery => {
  if (utxos.length === 0) {
    throw new Error(`Asset lock funding address ${fundingAddress} has no unspent outputs`)
  }

  let inputs: CoreWalletUtxo[]
  let amount: bigint
  let fee: bigint
  let change: bigint

  if (amountDuffs == null) {
    const totalIn = utxos.reduce((sum, utxo) => sum + utxo.amount, 0n)

    inputs = utxos
    fee = estimateCoreFee(utxos.length, 1)
    amount = totalIn - fee
    change = 0n

    if (amount <= 0n) {
      throw new Error(
        `Asset lock funding address ${fundingAddress} holds ${totalIn.toString()} duffs, ` +
        `which does not cover the ${fee.toString()} duff fee to spend it`
      )
    }
  } else {
    const selection = selectCoreUtxos(utxos, amountDuffs, 1)

    inputs = selection.inputs
    amount = amountDuffs
    fee = selection.fee
    change = selection.change
  }

  const transaction = buildCoreTransfer(
    inputs,
    [{ address: toAddress, amountDuffs: amount }],
    fundingAddress,
    change,
    network
  )

  transaction.sign(PrivateKey.fromWIF(privateKeyWif))

  // Sanity-check the result before anything is broadcast: the outputs may not
  // exceed what the inputs carry, whatever coin selection decided.
  const totalIn = inputs.reduce((sum, utxo) => sum + utxo.amount, 0n)
  const totalOut = amount + change

  if (totalOut + fee !== totalIn) {
    throw new Error(
      `Refusing to broadcast a recovery that does not balance: ${totalIn.toString()} in, ` +
      `${totalOut.toString()} out plus ${fee.toString()} fee`
    )
  }

  return {
    transaction,
    txid: transaction.hash(),
    amountDuffs: amount,
    feeDuffs: fee,
    changeDuffs: change,
    inputs,
    swept: change === 0n && inputs.length === utxos.length
  }
}

// What an address can pay out across a single recipient output, for a Max button
// that has to show a number before anything is built.
export const maxFundingAddressRecovery = (utxos: CoreWalletUtxo[]): bigint => maxCoreSpend(utxos, 1)
