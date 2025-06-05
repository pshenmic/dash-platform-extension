import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {DashPlatformProtocolWASM, IdentityPublicKeyWASM, PrivateKeyWASM} from "pshenmic-dpp";
import DashPlatformSDK from "dash-platform-sdk";
import {Network} from "../../../../types/enums/Network";
import {EventData} from "../../../../types/EventData";
import {ApproveStateTransitionResponse} from "../../../../types/messages/response/ApproveStateTransitionResponse";
import {ApproveStateTransitionPayload} from "../../../../types/messages/payloads/ApproveStateTransitionPayload";
import {StateTransition} from "../../../../types/StateTransition";
import {base64} from "@scure/base";

interface KeyPair {
    identityPublicKey: IdentityPublicKeyWASM
    privateKey?: PrivateKeyWASM
}

export default function approveStateTransitionHandler(stateTransitionsRepository: StateTransitionsRepository, identitiesRepository: IdentitiesRepository, dpp: DashPlatformProtocolWASM, sdk: DashPlatformSDK, network: Network) {
    return async (data: EventData): Promise<ApproveStateTransitionResponse> => {
        const payload: ApproveStateTransitionPayload = data.payload

        const identity = await identitiesRepository.getByIdentifier(payload.identity)

        if (!identity) {
            throw new Error(`Identity with identifier ${payload.identity} is not found`)
        }

        const {PrivateKeyWASM} = dpp

        const identityPublicKeys: IdentityPublicKeyWASM[] = await sdk.identities.getIdentityPublicKeys(identity.identifier)

        const [keyPair]: KeyPair[] = identityPublicKeys
            .map((identityPublicKey) => {
                // get identity
                const [privateKey] = identity.privateKeys
                    .map(privateKey => PrivateKeyWASM.fromHex(privateKey, network))
                    .filter(privateKey => privateKey.getPublicKeyHash() === identityPublicKey.getPublicKeyHash())

                return {identityPublicKey, privateKey}
            })
            .filter(keyPair => !!keyPair.privateKey)

        if (!keyPair) {
            throw new Error(`Matching private key for Identity ${identity.identifier} is not found`)
        }

        const stateTransition: StateTransition = await stateTransitionsRepository.get(payload.hash)

        const stateTransitionWASM = dpp.StateTransitionWASM.fromBytes(base64.decode(stateTransition.unsigned))

        stateTransitionWASM.sign(keyPair.privateKey, keyPair.identityPublicKey)

        const signature = stateTransitionWASM.signature
        const signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId

        return {
            stateTransition: await stateTransitionsRepository.markApproved(stateTransition.hash, sdk.utils.bytesToHex(signature), signaturePublicKeyId)
        }
    }
}
