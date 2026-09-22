import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { IdentityFundingOperation } from '../../../../types/IdentityFundingOperation'
import { PrepareIdentityFundingPayload } from '../../../../types/messages/payloads/PrepareIdentityFundingPayload'
import { Wallet } from '../../../../types/Wallet'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { isPendingFundingOperation } from '../../../repository/IdentityFundingRepository'
import { IdentityFundingClients, IdentityFundingService } from '../../../services/IdentityFundingService'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'
import { decryptMnemonic, validateIdentifier } from '../../../../utils'
import { selectAssetLockUtxos } from '../../../../utils/buildAssetLockFromUtxos'
import { fundingResponse, validateFundingScope } from './identityFundingPayload'

const CREDITS_PER_DUFF = 1000n

// Quotes an identity registration or top-up paid from the wallet's own Core
// coins, and saves it to the journal with the asset lock signed, so confirming it
// never reselects coins. The same operation id returns the saved quote; a pending
// Core operation (or another registration) has to be resumed or cancelled first.
export class PrepareIdentityFundingHandler implements APIHandler {
  walletRepository: WalletRepository
  service: IdentityFundingService

  constructor (walletRepository: WalletRepository, service: IdentityFundingService) {
    this.walletRepository = walletRepository
    this.service = service
  }

  async handle (event: EventData): Promise<IdentityFundingOperation> {
    const payload: PrepareIdentityFundingPayload = event.payload
    const repository = this.service.repository(payload)

    // Indexes, coins and the Platform nonce are reserved under the journal lock.
    return await repository.withLock(async () => {
      const walletRepository = this.walletRepository.forScope(payload)
      const wallet = await walletRepository.getCurrent()

      if (wallet == null || wallet.type !== 'seedphrase') {
        throw new Error('Select a seedphrase wallet on this network')
      }

      // Validates the password even when a saved quote is returned.
      decryptMnemonic(wallet, payload.password)

      const previous = await repository.get(payload.operationId)

      if (previous != null) {
        if (!this.isSameRequest(previous, payload)) {
          throw new Error('Operation id is already used for different funding parameters')
        }

        return fundingResponse(previous)
      }

      const operations = await repository.getAll()
      // One pending operation per source: two would select the same coins.
      // Registrations also share the identity index sequence.
      const conflicting = operations.find(op => isPendingFundingOperation(op) &&
        (op.source === payload.source || (op.kind === 'registration' && payload.kind === 'registration')))

      if (conflicting != null) {
        throw new Error(`Resume or cancel the pending ${conflicting.source} funding operation first`)
      }

      const clients = this.service.clientsFor(payload)
      const legacy = await new AssetLockFundingAddressesRepository(repository.storageAdapter, payload).getAll()

      // A legacy asset lock broadcast before its index was pinned could have funded
      // any index: allocating another now could take the same one.
      if (legacy.some(entry => !entry.used && (entry.purpose ?? 'registration') === 'registration' && entry.assetLockTxid != null && entry.registrationIdentityIndex == null)) {
        throw new Error('Resume the legacy asset lock with an unknown identity index before allocating another identity')
      }

      const operation: IdentityFundingOperation = {
        id: payload.operationId,
        walletId: payload.walletId,
        network: payload.network,
        account: 0,
        kind: payload.kind,
        source: payload.source,
        amountCredits: payload.amountCredits,
        identityId: payload.identityId,
        status: 'prepared',
        createdAt: Date.now()
      }

      if (operation.kind === 'registration') {
        const identities = await new IdentitiesRepository(repository.storageAdapter, clients.sdk, payload).getAll()
        const taken = [
          ...identities.map(identity => identity.index),
          ...operations.map(op => op.identityIndex),
          ...legacy.map(entry => entry.registrationIdentityIndex)
        ].filter((index): index is number => index != null)

        operation.identityIndex = await this.service.reserveIdentityIndex(wallet, payload.password, clients.sdk, taken)
      }

      await this.quoteCore(operation, operations, legacy, walletRepository, wallet, payload.password, clients)

      const feeCredits = BigInt(operation.feeCredits ?? '0')

      if (BigInt(operation.amountCredits) <= feeCredits) {
        throw new Error('Funding amount must exceed the estimated Platform fee')
      }

      operation.estimatedNetCredits = (BigInt(operation.amountCredits) - feeCredits).toString()
      await repository.save(operation)

      return fundingResponse(operation)
    })
  }

  // Selects and verifies the account's coins, signs the asset lock and sizes the
  // Platform fee of the transition it will fund. Nothing is broadcast here.
  private async quoteCore (
    operation: IdentityFundingOperation,
    operations: IdentityFundingOperation[],
    legacy: AssetLockFundingAddressSchema[],
    walletRepository: WalletRepository,
    wallet: Wallet,
    password: string,
    clients: IdentityFundingClients
  ): Promise<void> {
    const { sdk, core } = clients
    const amountCredits = BigInt(operation.amountCredits)

    if (amountCredits % CREDITS_PER_DUFF !== 0n) {
      throw new Error('Core amount must be a whole number of duffs (1000 credits)')
    }

    if (operation.kind === 'topUp') {
      const taken = [...operations.map(op => op.topUpIndex), ...legacy.map(entry => entry.index)]
        .filter((index): index is number => index != null)

      operation.topUpIndex = await this.service.reserveTopUpIndex(wallet, password, sdk, taken)
    }

    const creditKey = await this.service.creditKey(operation, wallet, password, sdk)
    const creditOutputAddress = sdk.keyPair.p2pkhAddress(creditKey.getPublicKey().bytes(), wallet.network as any)
    const xpub = await this.service.coreAccountXpub(walletRepository, wallet, password, sdk)
    const { utxos, nextUnusedChange } = await this.service.loadSpendableUtxos(xpub, wallet, sdk)

    operation.changeIndex = Math.max(nextUnusedChange, ...operations.map(op => (op.changeIndex ?? -1) + 1))

    // Completed operations keep their outpoints: an indexer may still report a
    // spent output. A cancelled or failed operation never spent its inputs.
    const reserved = new Set(operations
      .filter(op => op.status !== 'cancelled' && op.status !== 'failed')
      .flatMap(op => op.corePlan?.inputs.map(input => `${input.txid}:${input.vout}`) ?? []))

    const plan = selectAssetLockUtxos(
      utxos,
      amountCredits / CREDITS_PER_DUFF,
      creditOutputAddress,
      this.service.changeAddress(xpub, wallet, sdk, operation.changeIndex),
      reserved
    )

    await this.service.verifyUtxoParents(plan.inputs, core)

    const tx = await this.service.signAssetLock(plan, wallet, password, sdk)

    operation.corePlan = plan
    operation.coreTransaction = tx.hex()
    operation.assetLockTxid = tx.hash()
    operation.feeCredits = (await this.service.estimateAssetLockTransitionFee(operation, tx.hash(), wallet, password, sdk)).toString()
    operation.balanceCredits = (utxos
      .filter(input => !reserved.has(`${input.txid}:${input.vout}`))
      .reduce((sum, input) => sum + BigInt(input.amount), 0n) * CREDITS_PER_DUFF).toString()
  }

  private isSameRequest (previous: IdentityFundingOperation, payload: PrepareIdentityFundingPayload): boolean {
    return previous.kind === payload.kind &&
      previous.source === payload.source &&
      previous.amountCredits === payload.amountCredits &&
      (payload.kind !== 'topUp' || previous.identityId === payload.identityId)
  }

  validatePayload (payload: PrepareIdentityFundingPayload): string | null {
    const scopeError = validateFundingScope(payload)

    if (scopeError != null) {
      return scopeError
    }
    if (typeof payload.operationId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(payload.operationId)) {
      return 'Invalid operation id'
    }
    if (payload.source !== 'core') {
      return 'Invalid funding source'
    }
    if (payload.kind !== 'registration' && payload.kind !== 'topUp') {
      return 'Invalid funding operation'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (typeof payload.amountCredits !== 'string' || !/^[1-9]\d{0,18}$/.test(payload.amountCredits)) {
      return 'Amount must be a positive integer string of credits'
    }
    if (payload.kind === 'topUp' && !validateIdentifier(payload.identityId ?? '')) {
      return 'Invalid target identity'
    }
    if (payload.kind === 'registration' && payload.identityId != null) {
      return 'Registration cannot specify a target identity'
    }

    return null
  }
}
