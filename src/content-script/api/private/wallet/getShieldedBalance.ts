import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { ShieldedService } from '../../../services/ShieldedService'
import { SHIELDED_ADDRESS_DEFAULT_COUNT } from '../../../../constants'
import { GetShieldedBalancePayload } from '../../../../types/messages/payloads/GetShieldedBalancePayload'
import { GetShieldedBalanceResponse } from '../../../../types/messages/response/GetShieldedBalanceResponse'

// Computes the current wallet's shielded (Orchard) pool balance for an account.
// Shielded balance is note-based, not address-based: the whole note set is
// scanned, trial-decrypted with the wallet's viewing key (needs the password →
// seed), filtered by spent nullifiers, and the unspent note values are summed.
// Balance crosses the messaging boundary as a string (bigint does not serialize).
export class GetShieldedBalanceHandler implements APIHandler {
  walletRepository: WalletRepository
  shielded: ShieldedService

  constructor (walletRepository: WalletRepository, shielded: ShieldedService) {
    this.walletRepository = walletRepository
    this.shielded = shielded
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
    const seed = this.shielded.deriveSeed(wallet, payload.password)

    const allNotes = await this.shielded.fetchAllNotes()
    const recovered = this.shielded.recoverOwnNotes(allNotes, seed, account)

    const statuses = await this.shielded.nullifierStatuses(recovered.map(note => this.shielded.noteNullifier(note)))

    // Map our known diversified addresses to their derivation index so the
    // per-address breakdown can label them; notes to an address outside this
    // window still count, with diversifierIndex null.
    const derived = this.shielded.deriveAddresses(wallet, payload.password, account, SHIELDED_ADDRESS_DEFAULT_COUNT)
    const diversifierIndexByAddress = new Map(derived.map(entry => [entry.address, entry.diversifierIndex]))

    const { balance, spendableNotes, byAddress } = this.shielded.sumUnspentValue(recovered, statuses, wallet.network, diversifierIndexByAddress)

    return {
      balance: balance.toString(),
      spendableNotes,
      totalNotes: allNotes.length,
      byAddress: byAddress.map(entry => ({
        address: entry.address,
        diversifierIndex: entry.diversifierIndex,
        balance: entry.balance.toString(),
        spendableNotes: entry.spendableNotes
      }))
    }
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
