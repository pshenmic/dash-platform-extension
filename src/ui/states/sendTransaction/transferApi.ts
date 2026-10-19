import { useMemo } from 'react'
import { base64 } from '@scure/base'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import type { StateTransitionWASM } from 'dash-platform-sdk/types'
import { useExtensionAPI, useSdk } from '../../hooks'
import { getStateTransitionKeyRequirements, loadSigningKeys, pickSigningKey } from '../../../utils'
import { WITHDRAWAL_POOLING } from '../../../constants'
import type { NetworkType, PrivateAPIClient } from '../../../types'
import type { EstimateWithdrawalFeePayload } from '../../../types/messages/payloads/EstimateWithdrawalFeePayload'
import type { PendingAssetLock } from '../../../types/messages/response/ListPendingAssetLocksResponse'
import { trackShieldedSync } from '../../utils/shieldedSync'

export interface TransferTxResult {
  txHash: string
}

// Core payment with its fee in duffs.
export interface CorePaymentResult extends TransferTxResult {
  feeDuffs: bigint
}

// Wallet payment locked into Platform; `resumed` means an earlier payment was finished, `creditedCredits` is null when the response has no amount.
export interface CoreFundingResult extends TransferTxResult {
  coreTxHash: string
  feeDuffs: bigint
  resumed: boolean
  creditedCredits: bigint | null
}

// Platform payment with its fee in credits.
export interface PlatformPaymentResult extends TransferTxResult {
  feeCredits: bigint
}

// Platform address payment output; amount in credits.
export interface PlatformOutput {
  address: string
  amountCredits: bigint
}

// Core payment output; amount in duffs.
export interface CoreOutput {
  address: string
  amountDuffs: bigint
}

// Fee in duffs of a Core payment and what its outputs pay out; under send-max the most one output gets after the fee.
export interface CoreTransferEstimate {
  feeDuffs: bigint
  amountDuffs: bigint
}

// Fee and amount window of a Platform transfer in credits, priced before signing.
export interface PlatformFeeEstimate {
  feeCredits: bigint
  maxAmountCredits: bigint
  minAmountCredits: bigint | null
  // Fee comes out of the amount instead of on top of it.
  feeTakenFromAmount: boolean
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

  async send (toAddress: string, amountCredits: bigint, password: string, fromAddress?: string): Promise<PlatformPaymentResult> {
    return await this.sendPlatformTransaction([{ address: toAddress, amountCredits }], password, fromAddress)
  }

  // Pays every output from one platform address; same fee model as estimatePlatformTransfer, so its Max is accepted.
  async sendPlatformTransaction (outputs: PlatformOutput[], password: string, fromAddress?: string): Promise<PlatformPaymentResult> {
    const payload = outputs.map(output => ({ address: output.address, amountCredits: output.amountCredits.toString() }))
    const { stHash, feeCredits } = await this.extensionAPI.sendPlatformTransaction({ outputs: payload, fromAddress }, password)
    return { txHash: stHash, feeCredits: BigInt(feeCredits) }
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
    const { feeDuffs, amountDuffs } = await this.extensionAPI.estimateCoreTransfer({ outputs: toOutputPayload(outputs), changeAddress, sendMax })
    return { feeDuffs: BigInt(feeDuffs), amountDuffs: BigInt(amountDuffs) }
  }

  async estimatePlatformTransfer (outputCount: number, fromAddress?: string): Promise<PlatformFeeEstimate> {
    const { feeCredits, maxAmountCredits } = await this.extensionAPI.estimatePlatformTransfer(outputCount, fromAddress)
    return { feeCredits: BigInt(feeCredits), maxAmountCredits: BigInt(maxAmountCredits), minAmountCredits: null, feeTakenFromAmount: false }
  }

  async estimateWithdrawalFee (params: EstimateWithdrawalFeePayload): Promise<PlatformFeeEstimate> {
    const { feeCredits, maxAmountCredits, minAmountCredits, feeTakenFromAmount } = await this.extensionAPI.estimateWithdrawalFee(params)
    return { feeCredits: BigInt(feeCredits), maxAmountCredits: BigInt(maxAmountCredits), minAmountCredits: BigInt(minAmountCredits), feeTakenFromAmount }
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

  async discardAssetLockFunding (fundingAddress: string): Promise<void> {
    await this.extensionAPI.discardAssetLockFunding(fundingAddress)
  }

  async topUpIdentityFromWallet (identityId: string, amountDuffs: bigint, password: string, walletId?: string, network?: NetworkType): Promise<CoreFundingResult> {
    const response = await this.extensionAPI.topUpIdentityFromWallet(amountDuffs.toString(), password, identityId, walletId, network)
    return { txHash: response.stateTransitionHash, coreTxHash: response.fundingTxid, feeDuffs: BigInt(response.coreFeeDuffs), resumed: response.resumed, creditedCredits: BigInt(response.topUpAmount) }
  }

  async fundPlatformAddressFromWallet (platformAddress: string, amountDuffs: bigint, password: string): Promise<CoreFundingResult> {
    const response = await this.extensionAPI.fundPlatformAddressFromWallet(platformAddress, amountDuffs.toString(), password)
    return { txHash: response.stateTransitionHash, coreTxHash: response.fundingTxid, feeDuffs: BigInt(response.coreFeeDuffs), resumed: response.resumed, creditedCredits: null }
  }

  async shieldFromWallet (amountDuffs: bigint, password: string, toShieldedAddress?: string): Promise<CoreFundingResult> {
    const response = await this.extensionAPI.shieldFromWallet(amountDuffs.toString(), password, toShieldedAddress)
    return { txHash: response.stHash, coreTxHash: response.fundingTxid, feeDuffs: BigInt(response.coreFeeDuffs), resumed: response.resumed, creditedCredits: BigInt(response.shieldedAmountCredits) }
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
