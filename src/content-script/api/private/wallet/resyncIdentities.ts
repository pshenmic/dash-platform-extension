
// if keystore - get all private keys and get identities
// if seedphrase - derive private keys

// approve - ask password, derive key and sign
// approve - show all private keys and sign with specific
import {IdentitiesRepository} from '../../../repository/IdentitiesRepository'
import {EventData} from '../../../../types/EventData'
import {APIHandler} from '../../APIHandler'
import {WalletRepository} from '../../../repository/WalletRepository'
import {KeypairRepository} from '../../../repository/KeypairRepository'
import {DashPlatformSDK} from 'dash-platform-sdk'
import {ResyncIdentitiesPayload} from "../../../../types/messages/payloads/ResyncIdentitiesPayload";
import {ResyncIdentitiesResponse} from "../../../../types/messages/response/ResyncIdentitiesResponse";
import {WalletType} from "../../../../types/WalletType";
import {decrypt, PrivateKey} from "eciesjs";
import {bytesToUtf8, fetchIdentitiesBySeed, hexToBytes} from "../../../../utils";
import {StorageAdapter} from "../../../storage/storageAdapter";
import hash from "hash.js";

export class ResyncIdentitiesHandler implements APIHandler {
    identitiesRepository: IdentitiesRepository
    walletRepository: WalletRepository
    storageAdapter: StorageAdapter
    sdk: DashPlatformSDK

    constructor (identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository, sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
        this.identitiesRepository = identitiesRepository
        this.walletRepository = walletRepository
        this.storageAdapter = storageAdapter
        this.sdk = sdk
    }

    async handle (event: EventData): Promise<ResyncIdentitiesResponse> {
        const payload: ResyncIdentitiesPayload = event.payload
        const wallet = await this.walletRepository.getCurrent()

        if (wallet == null) {
            throw new Error('Wallet is not chosen')
        }

        if (wallet.walletType === WalletType.keystore) {
            throw new Error("Resync identities is not available for keystore wallets")
        }

        if (wallet.encryptedMnemonic == null) {
            throw new Error('Encrypted mnemonic not set for seedphrase wallet')
        }

        const passwordHash = hash.sha256().update(payload.password).digest('hex')
        const secretKey = PrivateKey.fromHex(passwordHash)

        let mnemonic

        try {
            mnemonic = bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(wallet.encryptedMnemonic)))
        } catch (e) {
            throw new Error('Failed to decrypt')
        }

        const seed = await this.sdk.keyPair.mnemonicToSeed(mnemonic, undefined, true)

        const identities = await fetchIdentitiesBySeed(seed, this.sdk)

        await this.identitiesRepository.replaceAll(identities.map((identity, index) => ({identifier: identity.id.base58(), index, label: null})))

        return {identitiesCount: identities.length}
    }

    validatePayload (payload: ResyncIdentitiesPayload): string | null {
        if(payload.password === null || payload.password == "") {
            return 'Password not provided'
        }

        return null
    }
}
