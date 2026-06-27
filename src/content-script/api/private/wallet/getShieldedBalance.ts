import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { decryptMnemonic, fetchAllShieldedNotes, sumUnspentShieldedValue } from '../../../../utils'
import { GetShieldedBalancePayload } from '../../../../types/messages/payloads/GetShieldedBalancePayload'
import { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'

// Computes the current wallet's shielded (Orchard) pool balance for an account.
// Shielded balance is note-based, not address-based: the whole note set is
// scanned, trial-decrypted with the wallet's viewing key (needs the password →
// seed), filtered by spent nullifiers, and the unspent note values are summed.
// Balance crosses the messaging boundary as a string (bigint does not serialize).
export class GetShieldedBalanceHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetShieldedBalanceResponse> {
    const payload: GetShieldedBalancePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielded balance can only be read from a seedphrase wallet')
    }

    const account = payload.account ?? 0
    const seed = this.sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, payload.password))

    const allNotes = await fetchAllShieldedNotes(this.sdk)
    const recovered = this.sdk.shielded.recoverNotes(allNotes, seed, account)

    const nullifiers = recovered
      .map(recoveredNote => allNotes[recoveredNote.index]?.nullifier)
      .filter((nullifier): nullifier is Uint8Array => nullifier != null)

    const statuses = nullifiers.length > 0
      ? await this.sdk.shielded.getShieldedNullifiers(nullifiers)
      : []

    const { balance, spendableNotes } = sumUnspentShieldedValue(recovered, allNotes, statuses)

    return { balance: balance.toString(), spendableNotes, totalNotes: allNotes.length }
  }

  validatePayload (payload: GetShieldedBalancePayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.account != null && (!Number.isInteger(payload.account) || payload.account < 0)) {
      return 'Account must be a non-negative integer'
    }

    return null
  }
}
