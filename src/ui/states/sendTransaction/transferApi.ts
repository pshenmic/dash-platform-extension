import { useMemo } from 'react'
import { base64 } from '@scure/base'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import type { StateTransitionWASM } from 'dash-platform-sdk/types'
import { useExtensionAPI, useSdk } from '../../hooks'
import { getStateTransitionKeyRequirements, loadSigningKeys, pickSigningKey } from '../../../utils'
import { WITHDRAWAL_POOLING } from '../../../constants'
import type { NetworkType, PrivateAPIClient } from '../../../types'
import type { ShieldedSpendKind } from '../../../types/ShieldedSpendKind'
import type { PendingAssetLock } from '../../../types/messages/response/ListPendingAssetLocksResponse'
import { trackShieldedSync } from '../../utils/shieldedSync'

export interface TransferTxResult {
  txHash: string
}

// Core payment with its fee in duffs.
export interface CorePaymentResult extends TransferTxResult {
  feeDuffs: bigint
}

// Wallet payment locked into Platform: the Platform hash, the Core payment and its fee in duffs ("0" when an earlier payment was reused).
export interface CoreFundingResult extends TransferTxResult {
  coreTxHash: string
  feeDuffs: bigint
}

// Core payment output; amount in duffs.
export interface CoreOutput {
  address: string
  amountDuffs: bigint
}

// Fee in duffs of a Core payment and the most its inputs can pay out.
export interface CoreTransferEstimate {
  feeDuffs: bigint
  maxSendableDuffs: bigint
}

const toOutputPayload = (outputs: CoreOutput[]): Array<{ address: string, amountDuffs: string }> =>
  outputs.map(output => ({ address: output.address, amountDuffs: output.amountDuffs.toString() }))

// Registers an identity state transition, signs it with a matching key and broadcasts it.
const signAndBroadcast = async (
  sdk: DashPlatformSDK,
  extensionAPI: PrivateAPIClient,
  identityId: string,
  stateTransition: StateTransitionWASM,
  password: string,
  isTokenTransfer: boolean
): Promise<TransferTxResult> => {
  const keys = await loadSigningKeys(sdk, extensionAPI, identityId)
  const key = pickSigningKey(keys, getStateTransitionKeyRequirements(stateTransition, isTokenTransfer))

  if (key == null) throw new Error('This identity has no private key that can sign this transfer')

  const { stateTransition: created } = await extensionAPI.createStateTransition(base64.encode(stateTransition.bytes()))
  const { txHash } = await extensionAPI.approveStateTransition(created.unsignedHash, identityId, key.keyId, password)

  return { txHash }
}

// Single entry point of the send wizard for transfer API calls.
export class TransferApi {
  constructor (private readonly sdk: DashPlatformSDK, private readonly extensionAPI: PrivateAPIClient) {}

  async checkPassword (password: string): Promise<boolean> {
    return (await this.extensionAPI.checkPassword(password)).success
  }

  async creditTransfer (identityId: string, recipientId: string, amountCredits: bigint, password: string): Promise<TransferTxResult> {
    const nonce = await this.sdk.identities.getIdentityNonce(identityId)
    const stateTransition = this.sdk.identities.createStateTransition('creditTransfer', {
      identityId,
      amount: amountCredits,
      recipientId,
      identityNonce: nonce + 1n
    })
    return await signAndBroadcast(this.sdk, this.extensionAPI, identityId, stateTransition, password, false)
  }

  async identityWithdraw (identityId: string, coreAddress: string, amountCredits: bigint, password: string): Promise<TransferTxResult> {
    const nonce = await this.sdk.identities.getIdentityNonce(identityId)
    const stateTransition = this.sdk.identities.createStateTransition('withdrawal', {
      identityId,
      amount: amountCredits,
      withdrawalAddress: coreAddress,
      identityNonce: nonce + 1n,
      pooling: WITHDRAWAL_POOLING
    })
    return await signAndBroadcast(this.sdk, this.extensionAPI, identityId, stateTransition, password, false)
  }

  async tokenTransfer (identityId: string, tokenId: string, recipientId: string, amount: bigint, password: string): Promise<TransferTxResult> {
    const baseTransition = await this.sdk.tokens.createBaseTransition(tokenId, identityId)
    const stateTransition = this.sdk.tokens.createStateTransition(baseTransition, identityId, 'transfer', { identityId: recipientId, amount })
    return await signAndBroadcast(this.sdk, this.extensionAPI, identityId, stateTransition, password, true)
  }

  async fund (identityId: string, toAddress: string, amountCredits: bigint, password: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.identityCreditTransferToAddresses(toAddress, amountCredits.toString(), password, identityId)).stHash }
  }

  async send (toAddress: string, amountCredits: bigint, password: string, fromAddress?: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.sendPlatformTransfer(toAddress, amountCredits.toString(), password, fromAddress)).stHash }
  }

  async topup (identityId: string, amountCredits: bigint, password: string, fromAddress?: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.topUpIdentityFromAddress(identityId, amountCredits.toString(), password, fromAddress)).stHash }
  }

  async withdraw (toCoreAddress: string, amountCredits: bigint, password: string, fromAddress?: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.withdrawPlatformAddressToCore(toCoreAddress, amountCredits.toString(), password, fromAddress)).stHash }
  }

  async shield (amountCredits: bigint, password: string, fromAddress?: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.shieldToPool(amountCredits.toString(), password, fromAddress)).stHash }
  }

  async unshield (toAddress: string, amountCredits: bigint, password: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.unshieldToAddress(toAddress, amountCredits.toString(), password)).stHash }
  }

  async shieldedTransfer (toShieldedAddress: string, amountCredits: bigint, password: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.sendShieldedTransfer(toShieldedAddress, amountCredits.toString(), password)).stHash }
  }

  async shieldedWithdraw (toCoreAddress: string, amountCredits: bigint, password: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.withdrawShieldedToCore(toCoreAddress, amountCredits.toString(), password)).stHash }
  }

  async sendCoreTransfer (toAddress: string, amountDuffs: bigint, password: string): Promise<CorePaymentResult> {
    const { txid, feeDuffs } = await this.extensionAPI.sendCoreTransfer(toAddress, amountDuffs.toString(), password)
    return { txHash: txid, feeDuffs: BigInt(feeDuffs) }
  }

  async sendCoreTransaction (outputs: CoreOutput[], password: string, changeAddress?: string): Promise<CorePaymentResult> {
    const { txid, feeDuffs } = await this.extensionAPI.sendCoreTransaction({ outputs: toOutputPayload(outputs), changeAddress }, password)
    return { txHash: txid, feeDuffs: BigInt(feeDuffs) }
  }

  async estimateCoreTransfer (outputs: CoreOutput[], changeAddress?: string, sendMax?: boolean): Promise<CoreTransferEstimate> {
    const { feeDuffs, maxSendableDuffs } = await this.extensionAPI.estimateCoreTransfer({ outputs: toOutputPayload(outputs), changeAddress, sendMax })
    return { feeDuffs: BigInt(feeDuffs), maxSendableDuffs: BigInt(maxSendableDuffs) }
  }

  async listCoreAddresses (): Promise<string[]> {
    return (await this.extensionAPI.listCoreAddresses()).map(entry => entry.address)
  }

  async getCoreReceiveAddress (): Promise<string> {
    return (await this.extensionAPI.getCoreReceiveAddress()).address
  }

  async listPendingAssetLocks (): Promise<PendingAssetLock[]> {
    return await this.extensionAPI.listPendingAssetLocks()
  }

  async topUpIdentityFromWallet (identityId: string, amountDuffs: bigint, password: string, walletId?: string, network?: NetworkType): Promise<CoreFundingResult> {
    const { stateTransitionHash, fundingTxid, coreFeeDuffs } = await this.extensionAPI.topUpIdentityFromWallet(amountDuffs.toString(), password, identityId, walletId, network)
    return { txHash: stateTransitionHash, coreTxHash: fundingTxid, feeDuffs: BigInt(coreFeeDuffs) }
  }

  async fundPlatformAddressFromWallet (platformAddress: string, amountDuffs: bigint, password: string): Promise<CoreFundingResult> {
    const { stateTransitionHash, fundingTxid, coreFeeDuffs } = await this.extensionAPI.fundPlatformAddressFromWallet(platformAddress, amountDuffs.toString(), password)
    return { txHash: stateTransitionHash, coreTxHash: fundingTxid, feeDuffs: BigInt(coreFeeDuffs) }
  }

  async shieldFromWallet (amountDuffs: bigint, password: string, toShieldedAddress?: string): Promise<CoreFundingResult> {
    const { stHash, fundingTxid, coreFeeDuffs } = await this.extensionAPI.shieldFromWallet(amountDuffs.toString(), password, toShieldedAddress)
    return { txHash: stHash, coreTxHash: fundingTxid, feeDuffs: BigInt(coreFeeDuffs) }
  }

  async topUpIdentityFromFunding (identityId: string, fundingAddress: string, fundingTxid: string, password: string, walletId?: string, network?: NetworkType): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.topUpIdentity(identityId, fundingAddress, fundingTxid, password, walletId, network)).stateTransitionHash }
  }

  async fundPlatformAddressFromFunding (platformAddress: string, fundingAddress: string, fundingTxid: string, password: string): Promise<TransferTxResult> {
    return { txHash: (await this.extensionAPI.fundPlatformAddressFromCore(platformAddress, fundingAddress, fundingTxid, password)).stateTransitionHash }
  }

  async estimateShieldedFee (spendType: ShieldedSpendKind, password: string, amountCredits?: bigint): Promise<bigint> {
    return BigInt((await this.extensionAPI.estimateShieldedFee(spendType, password, amountCredits?.toString())).feeCredits)
  }

  async syncShieldedNotes (password: string, walletId?: string, network?: NetworkType): Promise<void> {
    await trackShieldedSync(this.extensionAPI.syncShieldedNotes(password, undefined, walletId, network))
  }
}

// Transfer API bound to the current SDK and extension client.
export function useTransferApi (): TransferApi {
  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()
  return useMemo(() => new TransferApi(sdk, extensionAPI), [sdk, extensionAPI])
}
