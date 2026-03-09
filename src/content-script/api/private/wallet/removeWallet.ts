import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { RemoveWalletPayload } from '../../../../types/messages/payloads/RemoveWalletPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { WalletRepository } from '../../../repository/WalletRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { WalletType } from '../../../../types/WalletType'
import { Network } from '../../../../types/enums/Network'
import { validateWalletId } from '../../../../utils'

export class RemoveWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter

  constructor (walletRepository: WalletRepository, storageAdapter: StorageAdapter) {
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: RemoveWalletPayload = event.payload

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey')

    if (passwordPublicKey == null) {
      throw new Error('Password is not set')
    }

    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    if (secretKey.publicKey.toHex() !== passwordPublicKey) {
      throw new Error('Invalid password')
    }

    const wallet = await this.walletRepository.getById(payload.walletId)

    if (wallet == null) {
      throw new Error(`Could not find wallet ${payload.walletId}`)
    }

    const networks = Object.values(Network)

    await Promise.all(networks.map(async (network) => {
      const storageKeys = [
        `wallet_${network}_${payload.walletId}`,
        `identities_${network}_${payload.walletId}`,
        `stateTransitions_${network}_${payload.walletId}`,
        `appConnects_${network}_${payload.walletId}`
      ]

      if (wallet.type === WalletType.keystore) {
        storageKeys.push(`keyPairs_${network}_${payload.walletId}`)
      }

      await Promise.all(storageKeys.map(async (key) => await this.storageAdapter.remove(key)))
    }))

    const wallets = await this.storageAdapter.get('wallets') as string[]
    await this.storageAdapter.set('wallets', wallets.filter(id => id !== payload.walletId))

    const currentWalletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (currentWalletId === payload.walletId) {
      await this.storageAdapter.set('currentWalletId', null)
    }

    return {}
  }

  validatePayload (payload: RemoveWalletPayload): string | null {
    if (!validateWalletId(payload.walletId)) {
      return `Invalid wallet id: ${payload.walletId}`
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be included in the payload'
    }

    return null
  }
}
