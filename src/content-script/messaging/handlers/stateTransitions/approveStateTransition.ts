import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";
import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {DashPlatformProtocolWASM, IdentityPublicKeyWASM, PrivateKeyWASM} from "dash-platform-sdk";
import DashPlatformSDK from "dash-platform-sdk";
import {Network} from "../../../../types/enums/Network";
import {EventData} from "../../../../types/EventData";
import {ApproveStateTransitionResponse} from "../../../../types/messages/response/ApproveStateTransitionResponse";
import {ApproveStateTransitionPayload} from "../../../../types/messages/payloads/ApproveStateTransitionPayload";
import {StateTransition} from "../../../../types/StateTransition";
import {base64} from "@scure/base";
import {MessageBackendHandler} from "../../../MessagingBackend";
import {KeyPair} from "../../../../types/KeyPair";
import {validateHex, validateIdentifier} from "../../../../utils";

export class ApproveStateTransitionHandler implements MessageBackendHandler{
    stateTransitionsRepository: StateTransitionsRepository
    identitiesRepository: IdentitiesRepository
    dpp: DashPlatformProtocolWASM
    sdk: DashPlatformSDK
    network: Network

    constructor(stateTransitionsRepository: StateTransitionsRepository, identitiesRepository: IdentitiesRepository, sdk: DashPlatformSDK, network: Network) {
        this.stateTransitionsRepository = stateTransitionsRepository
        this.identitiesRepository = identitiesRepository
        this.sdk = sdk
        this.dpp = sdk.wasm
        this.network = network
    }

    async handle(event: EventData): Promise<ApproveStateTransitionResponse> {
        const payload: ApproveStateTransitionPayload = event.payload

        const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

        if (!identity) {
            throw new Error(`Identity with identifier ${payload.identity} is not found`)
        }

        const {PrivateKeyWASM} = this.dpp

        const identityPublicKeys: IdentityPublicKeyWASM[] = await this.sdk.identities.getIdentityPublicKeys(identity.identifier)

        const [keyPair]: KeyPair[] = identityPublicKeys
            .map((identityPublicKey) => {
                // get identity
                const [privateKey] = identity.privateKeys
                    .map(privateKey => PrivateKeyWASM.fromHex(privateKey, this.network))
                    .filter(privateKey => privateKey.getPublicKeyHash() === identityPublicKey.getPublicKeyHash())

                return {identityPublicKey, privateKey}
            })
            .filter(keyPair => !!keyPair.privateKey)

        if (!keyPair) {
            throw new Error(`Matching private key for Identity ${identity.identifier} is not found`)
        }

        const stateTransition: StateTransition = await this.stateTransitionsRepository.get(payload.hash)

        const stateTransitionWASM = this.dpp.StateTransitionWASM.fromBytes(base64.decode(stateTransition.unsigned))

        stateTransitionWASM.sign(keyPair.privateKey, keyPair.identityPublicKey)

        const signature = stateTransitionWASM.signature
        const signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId

        return {
            stateTransition: await this.stateTransitionsRepository.markApproved(stateTransition.hash, this.sdk.utils.bytesToHex(signature), signaturePublicKeyId)
        }
    }

    validatePayload(payload: ApproveStateTransitionPayload): null | string {
        if (!validateHex(payload.hash))  {
            return 'State transition hash is not valid'
        }

        if(!validateIdentifier(payload.identity)) {
            return 'Identity identifier is not valid'
        }

        return null
    }
}
