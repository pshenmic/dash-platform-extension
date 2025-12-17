import {
  StateTransitionWASM,
  BatchTransitionWASM,
  IdentityUpdateTransitionWASM,
  IdentityCreditTransferWASM,
  MasternodeVoteTransitionWASM
} from 'pshenmic-dpp'
import { StateTransitionTypeEnum, DocumentActionEnum, TokenActionEnum } from '../enums'
import type { DecodedStateTransition } from '../types/DecodedStateTransition'

export const decodeStateTransition = (stateTransitionWASM: StateTransitionWASM): DecodedStateTransition => {
  const type = stateTransitionWASM.getActionTypeNumber()

  switch (type) {
    case StateTransitionTypeEnum.BATCH: {
      const batch = BatchTransitionWASM.fromStateTransition(stateTransitionWASM)

      const transitions = batch.transitions.map((batchedTransition) => {
        const transition = batchedTransition.toTransition()
        const transitionType = transition.__type === 'DocumentTransitionWASM' ? 0 : 1

        const out: any = {}

        if (transitionType === 1) {
          // Token transition
          const tokenTransitionType = transition.getTransitionTypeNumber()
          const tokenTransition = transition.getTransition()

          out.action = TokenActionEnum[tokenTransitionType] ?? `TOKEN_${String(tokenTransitionType)}`
          out.tokenId = tokenTransition.base.tokenId.base58()
          out.identityContractNonce = String(transition.identityContractNonce)
          out.dataContractId = tokenTransition.base.dataContractId.base58()

          // Add specific fields based on token action type
          if (tokenTransition.amount != null) {
            out.amount = tokenTransition.amount.toString()
          }
          if (tokenTransition.recipientId != null) {
            out.recipient = tokenTransition.recipientId.base58()
          }
        } else {
          // Document transition
          out.action = DocumentActionEnum[transition.actionTypeNumber] ?? `DOCUMENT_ACTION_${String(transition.actionTypeNumber)}`
          out.id = transition.id.base58()
          out.dataContractId = transition.dataContractId.base58()
          out.revision = String(transition.revision)
          out.type = transition.documentTypeName
          out.identityContractNonce = String(transition.identityContractNonce)

          // Add specific fields based on document action type
          try {
            const createTransition = transition.createTransition
            if (createTransition != null) {
              if (createTransition.entropy != null) {
                out.entropy = Buffer.from(createTransition.entropy).toString('hex')
              }

              if (createTransition.data != null) {
                out.data = createTransition.data
              }

              if (createTransition.prefundedVotingBalance != null) {
                out.prefundedVotingBalance = {
                  [createTransition.prefundedVotingBalance.indexName]: String(createTransition.prefundedVotingBalance.credits)
                }
              }

              if (createTransition.base?.tokenPaymentInfo != null) {
                const tokenPaymentInfo = createTransition.base.tokenPaymentInfo
                out.tokenPaymentInfo = {
                  paymentTokenContractId: tokenPaymentInfo.paymentTokenContractId?.base58() ?? null,
                  tokenContractPosition: tokenPaymentInfo.tokenContractPosition,
                  minimumTokenCost: tokenPaymentInfo.minimumTokenCost?.toString() ?? null,
                  maximumTokenCost: tokenPaymentInfo.maximumTokenCost?.toString() ?? null,
                  gasFeesPaidBy: tokenPaymentInfo.gasFeesPaidBy
                }
              }
            }
          } catch (e) {
            console.log(e)
          }

          try {
            const replaceTransition = transition.replaceTransition
            if (replaceTransition?.data != null) {
              out.data = replaceTransition.data
            }
          } catch (e) {
            console.log(e)
          }
        }

        return out
      })

      return {
        type: StateTransitionTypeEnum.BATCH,
        typeString: 'BATCH',
        ownerId: stateTransitionWASM.getOwnerId().base58(),
        transitions,
        signaturePublicKeyId: stateTransitionWASM.signaturePublicKeyId,
        signature: Buffer.from(stateTransitionWASM.signature).toString('hex'),
        raw: Buffer.from(stateTransitionWASM.bytes()).toString('hex')
      }
    }

    case StateTransitionTypeEnum.IDENTITY_UPDATE: {
      const identityUpdateTransition = IdentityUpdateTransitionWASM.fromStateTransition(stateTransitionWASM)

      const publicKeysToAdd = identityUpdateTransition.publicKeyIdsToAdd.map((key: any) => {
        return {
          id: key.keyId,
          type: key.keyType,
          data: Buffer.from(key.data).toString('hex'),
          publicKeyHash: Buffer.from(key.getHash()).toString('hex'),
          purpose: key.purpose,
          securityLevel: key.securityLevel,
          readOnly: key.readOnly
        }
      })

      return {
        type: StateTransitionTypeEnum.IDENTITY_UPDATE,
        typeString: 'IDENTITY_UPDATE',
        identityId: identityUpdateTransition.identityIdentifier.base58(),
        revision: Number(identityUpdateTransition.revision),
        identityNonce: String(identityUpdateTransition.nonce),
        userFeeIncrease: identityUpdateTransition.userFeeIncrease,
        publicKeysToAdd,
        publicKeyIdsToDisable: Array.from(identityUpdateTransition.publicKeyIdsToDisable ?? []),
        signaturePublicKeyId: identityUpdateTransition.signaturePublicKeyId,
        signature: Buffer.from(identityUpdateTransition.signature).toString('hex'),
        raw: Buffer.from(stateTransitionWASM.bytes()).toString('hex')
      }
    }

    case StateTransitionTypeEnum.IDENTITY_CREDIT_TRANSFER: {
      const identityCreditTransferTransition = IdentityCreditTransferWASM.fromStateTransition(stateTransitionWASM)

      return {
        type: StateTransitionTypeEnum.IDENTITY_CREDIT_TRANSFER,
        typeString: 'IDENTITY_CREDIT_TRANSFER',
        identityNonce: String(identityCreditTransferTransition.nonce),
        userFeeIncrease: identityCreditTransferTransition.userFeeIncrease,
        senderId: identityCreditTransferTransition.senderId.base58(),
        recipientId: identityCreditTransferTransition.recipientId.base58(),
        amount: String(identityCreditTransferTransition.amount),
        signaturePublicKeyId: identityCreditTransferTransition.signaturePublicKeyId,
        signature: Buffer.from(stateTransitionWASM.signature)?.toString('hex') ?? null,
        raw: Buffer.from(stateTransitionWASM.bytes()).toString('hex')
      }
    }

    case StateTransitionTypeEnum.MASTERNODE_VOTE: {
      const masternodeVoteTransition = MasternodeVoteTransitionWASM.fromStateTransition(stateTransitionWASM)

      const towardsIdentity = masternodeVoteTransition.vote.resourceVoteChoice.getValue()?.base58()

      return {
        type: StateTransitionTypeEnum.MASTERNODE_VOTE,
        typeString: 'MASTERNODE_VOTE',
        proTxHash: masternodeVoteTransition.proTxHash.hex(),
        choice: `${masternodeVoteTransition.vote.resourceVoteChoice.getType()}${towardsIdentity != null ? `(${String(towardsIdentity)})` : ''}`,
        towardsIdentity: towardsIdentity ?? null,
        identityNonce: String(masternodeVoteTransition.nonce),
        userFeeIncrease: stateTransitionWASM.userFeeIncrease,
        indexValues: masternodeVoteTransition.vote.votePoll.indexValues.map((bytes: any) => Buffer.from(bytes).toString('base64')),
        contractId: masternodeVoteTransition.vote.votePoll.contractId.base58(),
        modifiedDataIds: masternodeVoteTransition.modifiedDataIds.map((identifier: any) => identifier.base58()),
        ownerId: stateTransitionWASM.getOwnerId().base58(),
        documentTypeName: masternodeVoteTransition.vote.votePoll.documentTypeName,
        indexName: masternodeVoteTransition.vote.votePoll.indexName,
        signaturePublicKeyId: stateTransitionWASM.signaturePublicKeyId,
        signature: Buffer.from(stateTransitionWASM.signature ?? []).toString('hex') ?? null,
        raw: Buffer.from(stateTransitionWASM.bytes()).toString('hex')
      }
    }

    default:
      // Fallback for unknown types - should never happen in production
      throw new Error(`Unknown state transition type: ${type}`)
  }
}
