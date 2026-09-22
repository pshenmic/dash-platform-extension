import { Transaction } from 'dash-core-sdk'
import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { IdentityFundingOperation, IdentityFundingSource } from '../../../../types/IdentityFundingOperation'
import { ExecuteIdentityFundingPayload } from '../../../../types/messages/payloads/ExecuteIdentityFundingPayload'
import { Wallet } from '../../../../types/Wallet'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentityFundingRepository } from '../../../repository/IdentityFundingRepository'
import { IdentityFundingClients, IdentityFundingService } from '../../../services/IdentityFundingService'
import { decryptMnemonic } from '../../../../utils'
import { txidToFilterBytes } from '../../../../utils/txidToFilterBytes'
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { isOutcomeUnknownError } from '../../../../utils/identityFundingErrors'
import { fundingResponse, validateFundingScope } from './identityFundingPayload'

// Confirms a prepared identity funding operation, or resumes one that was cut off.
// Every step sends bytes saved in the journal, so a retry never reselects coins.
// It broadcasts the asset lock, waits for its lock proof, builds the identity
// transition that spends it, then sends that and waits for Platform to confirm
// it. The subclasses fix which source and kind each API method drives.
export class ExecuteIdentityFundingHandler implements APIHandler {
  walletRepository: WalletRepository
  service: IdentityFundingService
  source: IdentityFundingSource
  kind: IdentityFundingOperation['kind']

  constructor (walletRepository: WalletRepository, service: IdentityFundingService, source: IdentityFundingSource, kind: IdentityFundingOperation['kind']) {
    this.walletRepository = walletRepository
    this.service = service
    this.source = source
    this.kind = kind
  }

  async handle (event: EventData): Promise<IdentityFundingOperation> {
    const payload: ExecuteIdentityFundingPayload = event.payload
    const repository = this.service.repository(payload)

    // Only one document drives an operation at a time. The journal lock is taken
    // just for each write, so a long wait here (lock proof, Platform result)
    // never holds up other operations or spends of this wallet.
    return await repository.withOperationLock(payload.operationId, async () => {
      const operation = await repository.get(payload.operationId)

      if (operation == null || operation.source !== this.source || operation.kind !== this.kind) {
        throw new Error('Funding operation does not match this request')
      }

      const walletRepository = this.walletRepository.forScope(payload)
      const wallet = await walletRepository.getCurrent()

      if (wallet == null || wallet.type !== 'seedphrase') {
        throw new Error('Funding wallet is unavailable')
      }

      decryptMnemonic(wallet, payload.password)

      if (operation.status === 'completed') {
        return fundingResponse(operation)
      }
      if (operation.status === 'cancelled' || operation.status === 'failed') {
        throw new Error(`Funding operation was ${operation.status}`)
      }

      const run = new FundingRun(repository, operation)

      try {
        await this.execute(run, walletRepository, wallet, payload.password, this.service.clientsFor(payload))
      } catch (error) {
        await run.fail(error)
        throw error
      }

      return fundingResponse(run.operation)
    })
  }

  private async execute (run: FundingRun, walletRepository: WalletRepository, wallet: Wallet, password: string, clients: IdentityFundingClients): Promise<void> {
    const { sdk } = clients

    if (run.operation.stateTransition == null) {
      await this.fundAssetLock(run, wallet, password, clients)
    }

    const saved = run.operation.stateTransition

    if (saved == null) {
      throw new Error('Missing saved Platform transition')
    }

    const transition = StateTransitionWASM.fromHex(saved)

    if (transition.hash(false) !== run.operation.stateTransitionHash) {
      throw new Error('Saved Platform transition hash mismatch')
    }

    if (run.operation.status !== 'confirmed') {
      await run.claim('platformBroadcast')
      await this.service.broadcastTransition(sdk, transition)
      // Verifies the GroveDB proof and the quorum signature, and throws when the
      // transition failed to execute.
      await sdk.stateTransitions.waitForStateTransitionResult(transition)
      await run.update({ status: 'confirmed' })
    }

    if (run.operation.kind === 'registration') {
      const identityId = await this.service.saveRegisteredIdentity(run.operation, walletRepository, wallet, password, sdk)

      if (identityId == null) {
        throw new Error('Confirmed registration has no identity yet; retry to resolve it')
      }

      await run.update({ identityId })
    }

    await run.update({ status: 'completed', error: undefined })
  }

  // Broadcasts the saved asset lock, waits for its InstantLock or ChainLock proof
  // and saves the identity transition that spends it.
  private async fundAssetLock (run: FundingRun, wallet: Wallet, password: string, clients: IdentityFundingClients): Promise<void> {
    const { sdk, core } = clients
    const { coreTransaction, assetLockTxid } = run.operation

    if (coreTransaction == null || assetLockTxid == null) {
      throw new Error('Missing saved Core transaction')
    }

    const tx = Transaction.fromHex(coreTransaction)

    if (tx.hash() !== assetLockTxid) {
      throw new Error('Saved Core transaction hash mismatch')
    }

    // Once the network took the asset lock the operation is 'proving' for good:
    // a retry never broadcasts it again, so a flaky node cannot make a lock that
    // is already on L1 look refused.
    const broadcast = run.operation.status !== 'proving'
    // A recovering operation needs a ChainLock proof; with no InstantLock stream
    // to listen to, the wait falls through to it.
    const subscription = run.operation.chainLockProofOnly === true
      ? noInstantLocks()
      : core.subscribeToTransactions([], [txidToFilterBytes(assetLockTxid)])

    if (broadcast) {
      // Persist intent BEFORE any network write. Cancellation is no longer safe.
      await run.claim('coreBroadcast')
    }

    const controller = new AbortController()
    // Consume the lazy stream before broadcast so a fast InstantLock is not
    // missed; the proof is stored only after the broadcast.
    const savedProof = run.operation.assetLockProof
    const proofPromise = savedProof != null
      ? Promise.resolve(savedProof)
      : waitForAssetLockProof(core, sdk, tx, assetLockTxid, subscription, undefined, undefined, controller.signal)
    void proofPromise.catch(() => {})

    try {
      if (broadcast) {
        await this.service.broadcastAssetLock(tx, core)
        await run.update({ status: 'proving' })
      }

      if (savedProof == null) {
        await run.update({ assetLockProof: await proofPromise })
      }
    } finally {
      controller.abort()
    }

    const proof = run.operation.assetLockProof

    if (proof == null) {
      throw new Error('Missing asset lock proof')
    }

    const transition = await this.service.buildAssetLockTransition(run.operation, proof, wallet, password, sdk)
    await run.update({ stateTransition: transition.hex(), stateTransitionHash: transition.hash(false) })
  }

  validatePayload (payload: ExecuteIdentityFundingPayload): string | null {
    const scopeError = validateFundingScope(payload)

    if (scopeError != null) {
      return scopeError
    }
    if (typeof payload.operationId !== 'string' || payload.operationId.length === 0) {
      return 'Operation id must be provided'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return null
  }
}

// An InstantLock stream that never yields, for a wait that must end on a ChainLock.
const noInstantLocks = (): ReturnType<IdentityFundingClients['core']['subscribeToTransactions']> => {
  return { async * [Symbol.asyncIterator] () {} } as any
}

// One execution of an operation: its current state and the journal writes that
// move it forward. Each write takes the journal lock for itself only.
class FundingRun {
  repository: IdentityFundingRepository
  operation: IdentityFundingOperation

  constructor (repository: IdentityFundingRepository, operation: IdentityFundingOperation) {
    this.repository = repository
    this.operation = operation
  }

  // A field set to undefined is removed, so the journal never stores it.
  async update (changes: Partial<IdentityFundingOperation>): Promise<void> {
    const merged = Object.entries({ ...this.operation, ...changes }).filter(([, value]) => value !== undefined)
    this.operation = Object.fromEntries(merged) as unknown as IdentityFundingOperation

    await this.repository.withLock(async () => { await this.repository.save(this.operation) })
  }

  // Moves to a network-writing status unless a concurrent cancel got there first:
  // both run under the journal lock.
  async claim (status: IdentityFundingOperation['status']): Promise<void> {
    this.operation = await this.repository.withLock(async () => {
      const stored = await this.repository.get(this.operation.id)

      if (stored == null || stored.status === 'cancelled') {
        throw new Error('Funding operation was cancelled')
      }

      const next = { ...this.operation, status }
      await this.repository.save(next)

      return next
    })
  }

  // Records the error. An unknown outcome may still execute and stays pending as
  // is. A Core transaction the network refused spent nothing and releases the
  // reservation; a transition rejected on an asset lock keeps the lock for a
  // fresh attempt.
  async fail (error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error)

    if (isOutcomeUnknownError(error)) {
      await this.update({ error: message })
    } else if (this.isReleasable()) {
      await this.update({ error: message, status: 'failed' })
    } else if (this.operation.status === 'platformBroadcast') {
      // The asset lock is on L1 and this transition did not spend it. Drop the
      // transition and its proof: a retry waits for a ChainLock proof of the same
      // lock and signs afresh, since an InstantLock proof expires. The credit
      // output is bound to the reserved key index, so the index stays.
      await this.update({
        error: message,
        status: 'proving',
        chainLockProofOnly: true,
        assetLockProof: undefined,
        stateTransition: undefined,
        stateTransitionHash: undefined
      })
    } else {
      await this.update({ error: message })
    }
  }

  // A Core transaction the network refused never left the wallet, so its coins
  // are free again. A Core asset lock already on L1 is different: its funds sit
  // in the lock, and the operation stays pending to finish on the same lock.
  private isReleasable (): boolean {
    return this.operation.status === 'coreBroadcast'
  }
}
