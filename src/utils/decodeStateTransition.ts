import {
  StateTransitionWASM,
  BatchTransitionWASM,
  IdentityCreateTransitionWASM,
  IdentityUpdateTransitionWASM,
  IdentityCreditTransferWASM,
  MasternodeVoteTransitionWASM
} from 'pshenmic-dpp'
import { StateTransitionTypeEnum, BatchActionTypeString } from '../enums'

interface DecodedStateTransition {
  type: number
  typeString: string
  [key: string]: any
}

export const decodeStateTransition = (stateTransitionWASM: StateTransitionWASM): DecodedStateTransition => {
  const type = stateTransitionWASM.getActionTypeNumber()
  const typeString = stateTransitionWASM.getActionType() // Get string directly from WASM

  const decoded: DecodedStateTransition = {
    type,
    typeString
  }

  switch (type) {
    case StateTransitionTypeEnum.BATCH: {
      const batch = BatchTransitionWASM.fromStateTransition(stateTransitionWASM)

      console.log('batch.transitions', batch.transitions)

      decoded.transitions = batch.transitions.map((batchedTransition) => {
        const transition = batchedTransition.toTransition()
        const transitionType = transition.__type === 'DocumentTransitionWASM' ? 0 : 1

        console.log('transition', transition)
        console.log('transitionType', transitionType)

        const out: any = {}

        if (transitionType === 1) {
          // Token transition
          const tokenTransitionType = transition.getTransitionTypeNumber()
          console.log('tokenTransitionType', tokenTransitionType)
          const tokenTransition = transition.getTransition()

          // Map token transition type number (0-10) to batch action type (6-16)
          const batchActionType = tokenTransitionType + 6
          out.action = BatchActionTypeString[batchActionType] ?? `TOKEN_${String(tokenTransitionType)}`
          out.tokenId = tokenTransition.base.tokenId.base58()
          out.identityContractNonce = String(transition.identityContractNonce)
          out.tokenContractPosition = tokenTransition.base.tokenContractPosition
          out.dataContractId = tokenTransition.base.dataContractId.base58()
          out.historicalDocumentTypeName = transition.getHistoricalDocumentTypeName()
          out.historicalDocumentId = transition.getHistoricalDocumentId(stateTransitionWASM.getOwnerId()).base58()

          // Add specific fields based on token action type
          if (tokenTransition.amount != null) {
            out.amount = tokenTransition.amount.toString()
          }
          if (tokenTransition.recipientId != null) {
            out.recipient = tokenTransition.recipientId.base58()
          }
          if (tokenTransition.publicNote != null) {
            out.publicNote = tokenTransition.publicNote
          }
        } else {
          // Document transition
          // Document action numbers map directly to batch action type (0-5)
          out.action = BatchActionTypeString[transition.actionTypeNumber] ?? `DOCUMENT_ACTION_${String(transition.actionTypeNumber)}`
          out.id = transition.id.base58()
          out.dataContractId = transition.dataContractId.base58()
          out.revision = String(transition.revision)
          out.type = transition.documentTypeName
          out.identityContractNonce = String(transition.identityContractNonce)

          // Add specific fields based on document action type
          if (transition.createTransition != null) {
            out.entropy = Buffer.from(transition.createTransition.entropy).toString('hex')
            out.data = transition.createTransition.data
            out.prefundedVotingBalance = transition.createTransition.prefundedVotingBalance
              ? {
                  [transition.createTransition.prefundedVotingBalance.indexName]: String(transition.createTransition.prefundedVotingBalance.credits)
                }
              : null

            if (transition.createTransition.base.tokenPaymentInfo != null) {
              const tpi = transition.createTransition.base.tokenPaymentInfo
              out.tokenPaymentInfo = {
                paymentTokenContractId: tpi.paymentTokenContractId?.base58() ?? null,
                tokenContractPosition: tpi.tokenContractPosition,
                minimumTokenCost: tpi.minimumTokenCost?.toString() ?? null,
                maximumTokenCost: tpi.maximumTokenCost?.toString() ?? null,
                gasFeesPaidBy: tpi.gasFeesPaidBy
              }
            }
          }

          if (transition.replaceTransition != null) {
            out.data = transition.replaceTransition.data
          }
        }

        return out
      })

      decoded.userFeeIncrease = stateTransitionWASM.userFeeIncrease
      decoded.signature = Buffer.from(stateTransitionWASM.signature).toString('hex')
      decoded.signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId
      decoded.ownerId = stateTransitionWASM.getOwnerId().base58()
      decoded.raw = Buffer.from(stateTransitionWASM.bytes()).toString('hex')

      break
    }

    case StateTransitionTypeEnum.IDENTITY_CREATE: {
      const identityCreateTransition = IdentityCreateTransitionWASM.fromStateTransition(stateTransitionWASM)
      const assetLockProof = identityCreateTransition.assetLock

      const outPoint = assetLockProof.getOutPoint()

      decoded.assetLockProof = {
        coreChainLockedHeight: assetLockProof.getLockType() === 'Chain' ? assetLockProof.getChainLockProof().coreChainLockedHeight : null,
        type: assetLockProof.getLockType() === 'Instant' ? 'instantSend' : 'chainLock',
        txid: outPoint != null ? outPoint.getTXID() : null,
        vout: outPoint != null ? outPoint.getVOUT() : null,
        fundingAddress: null,
        fundingAmount: null,
        instantLock: null
      }

      decoded.userFeeIncrease = stateTransitionWASM.userFeeIncrease
      decoded.identityId = stateTransitionWASM.getOwnerId().base58()
      decoded.signature = Buffer.from(stateTransitionWASM.signature ?? []).toString('hex')
      decoded.signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId
      decoded.raw = stateTransitionWASM.hex()

      decoded.publicKeys = identityCreateTransition.publicKeys.map((key: any) => {
        const { contractBounds } = key

        return {
          contractBounds: contractBounds
            ? {
                type: contractBounds.contractBoundsType ?? null,
                id: contractBounds.identifier.base58()
              }
            : null,
          id: key.keyId,
          type: key.keyType,
          data: Buffer.from(key.data).toString('hex'),
          publicKeyHash: Buffer.from(key.getHash()).toString('hex'),
          purpose: key.purpose,
          securityLevel: key.securityLevel,
          readOnly: key.readOnly,
          signature: Buffer.from(key.signature).toString('hex')
        }
      })

      break
    }

    case StateTransitionTypeEnum.IDENTITY_UPDATE: {
      const identityUpdateTransition = IdentityUpdateTransitionWASM.fromStateTransition(stateTransitionWASM)

      decoded.identityNonce = String(identityUpdateTransition.nonce)
      decoded.userFeeIncrease = identityUpdateTransition.userFeeIncrease
      decoded.identityId = identityUpdateTransition.identityIdentifier.base58()
      decoded.revision = String(identityUpdateTransition.revision)

      decoded.publicKeysToAdd = identityUpdateTransition.publicKeyIdsToAdd.map((key: any) => {
        const { contractBounds } = key

        return {
          contractBounds: contractBounds
            ? {
                type: contractBounds.contractBoundsType,
                id: contractBounds.identifier.base58(),
                typeName: contractBounds.documentTypeName
              }
            : null,
          id: key.keyId,
          type: key.keyType,
          data: Buffer.from(key.data).toString('hex'),
          publicKeyHash: Buffer.from(key.getHash()).toString('hex'),
          purpose: key.purpose,
          securityLevel: key.securityLevel,
          readOnly: key.readOnly,
          signature: Buffer.from(key.signature).toString('hex')
        }
      })

      decoded.publicKeyIdsToDisable = Array.from(identityUpdateTransition.publicKeyIdsToDisable ?? [])
      decoded.signature = Buffer.from(identityUpdateTransition.signature).toString('hex')
      decoded.signaturePublicKeyId = identityUpdateTransition.signaturePublicKeyId
      decoded.raw = Buffer.from(stateTransitionWASM.bytes()).toString('hex')

      break
    }

    case StateTransitionTypeEnum.IDENTITY_CREDIT_TRANSFER: {
      const identityCreditTransferTransition = IdentityCreditTransferWASM.fromStateTransition(stateTransitionWASM)

      decoded.identityNonce = String(identityCreditTransferTransition.nonce)
      decoded.userFeeIncrease = identityCreditTransferTransition.userFeeIncrease
      decoded.senderId = identityCreditTransferTransition.senderId.base58()
      decoded.recipientId = identityCreditTransferTransition.recipientId.base58()
      decoded.amount = String(identityCreditTransferTransition.amount)
      decoded.signaturePublicKeyId = identityCreditTransferTransition.signaturePublicKeyId
      decoded.signature = Buffer.from(stateTransitionWASM.signature)?.toString('hex') ?? null
      decoded.raw = Buffer.from(stateTransitionWASM.bytes()).toString('hex')

      break
    }

    case StateTransitionTypeEnum.MASTERNODE_VOTE: {
      const masternodeVoteTransition = MasternodeVoteTransitionWASM.fromStateTransition(stateTransitionWASM)

      const towardsIdentity = masternodeVoteTransition.vote.resourceVoteChoice.getValue()?.base58()

      decoded.indexValues = masternodeVoteTransition.vote.votePoll.indexValues.map((bytes: any) => Buffer.from(bytes).toString('base64'))
      decoded.contractId = masternodeVoteTransition.vote.votePoll.contractId.base58()
      decoded.modifiedDataIds = masternodeVoteTransition.modifiedDataIds.map((identifier: any) => identifier.base58())
      decoded.ownerId = stateTransitionWASM.getOwnerId().base58()
      decoded.signature = Buffer.from(stateTransitionWASM.signature ?? []).toString('hex') ?? null
      decoded.documentTypeName = masternodeVoteTransition.vote.votePoll.documentTypeName
      decoded.indexName = masternodeVoteTransition.vote.votePoll.indexName
      decoded.choice = `${masternodeVoteTransition.vote.resourceVoteChoice.getType()}${towardsIdentity != null ? `(${String(towardsIdentity)})` : ''}`
      decoded.userFeeIncrease = stateTransitionWASM.userFeeIncrease
      decoded.signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId
      decoded.raw = Buffer.from(stateTransitionWASM.bytes()).toString('hex')
      decoded.proTxHash = masternodeVoteTransition.proTxHash.hex()
      decoded.identityNonce = String(masternodeVoteTransition.nonce)

      break
    }

    default:
      // Unknown transaction type - return minimal info
      decoded.userFeeIncrease = stateTransitionWASM.userFeeIncrease
      decoded.signature = Buffer.from(stateTransitionWASM.signature ?? []).toString('hex')
      decoded.signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId
      decoded.raw = Buffer.from(stateTransitionWASM.bytes()).toString('hex')
  }

  return decoded
}
