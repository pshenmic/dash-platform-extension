import { EventData } from '../../types/EventData'
import { DashCoreSDK } from 'dash-core-sdk'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { StorageAdapter } from '../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { GetCurrentIdentityHandler } from './private/identities/getCurrentIdentity'
import { GetStateTransitionHandler } from './private/stateTransitions/getStateTransition'
import { ApproveStateTransitionHandler } from './private/stateTransitions/approveStateTransition'
import { RejectStateTransitionHandler } from './private/stateTransitions/rejectStateTransition'
import { APIHandler } from './APIHandler'
import { CreateWalletHandler } from './private/wallet/createWallet'
import { SwitchWalletHandler } from './private/wallet/switchWallet'
import { KeypairRepository } from '../repository/KeypairRepository'
import { WalletRepository } from '../repository/WalletRepository'
import { GetStatusHandler } from './private/extension/status'
import { SetupPasswordHandler } from './private/extension/setupPassword'
import { CheckPasswordHandler } from './private/extension/checkPassword'
import { SwitchIdentityHandler } from './private/wallet/switchIdentity'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { GetAppConnectHandler } from './private/appConnect/getAppConnect'
import { ApproveAppConnectHandler } from './private/appConnect/approveAppConnect'
import { RejectAppConnectHandler } from './private/appConnect/rejectAppConnect'
import { GetIdentitiesHandler } from './private/identities/getIdentities'
import { ResyncIdentitiesHandler } from './private/wallet/resyncIdentities'
import { SetWalletLabelHandler } from './private/wallet/setWalletLabel'
import { ImportIdentityHandler } from './private/identities/importIdentity'
import { GetAllWalletsHandler } from './private/wallet/getAllWallets'
import { AddIdentityPrivateKey } from './private/identities/addPrivateKey'
import { GetAvailableKeyPairs } from './private/identities/getAvailableKeyPairs'
import { SwitchNetworkHandler } from './private/wallet/switchNetwork'
import { RemoveIdentityPrivateKeyHandler } from './private/identities/removePrivateKey'
import { GetAllAppConnectsHandler } from './private/appConnect/getAllAppConnects'
import { RemoveAppConnectHandler } from './private/appConnect/removeAppConnect'
import { ExportPrivateKeyHandler } from './private/identities/exportPrivateKey'
import { RegisterUsernameHandler } from './private/identities/registerUsername'
import { ImportMasternodeIdentityHandler } from './private/identities/importMasternodeIdentity'
import { CreateStateTransitionHandler } from './private/stateTransitions/createStateTransition'
import { CreateIdentityPrivateKeyHandler } from './private/identities/createIdentityPrivateKey'
import { AssetLockFundingAddressesRepository } from '../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from '../services/CoreExplorerService'
import { RequestAssetLockFundingAddressHandler } from './private/assetLocks/requestAssetLockFundingAddress'
import { RequestTopUpFundingAddressHandler } from './private/assetLocks/requestTopUpFundingAddress'
import { RegisterIdentityHandler } from './private/identities/registerIdentity'
import { RemoveWalletHandler } from './private/wallet/removeWallet'
import { TopUpIdentityHandler } from './private/identities/topUpIdentity'
import { WalletSettingsRepository } from '../repository/WalletSettingsRepository'
import { GetSettingsHandler } from './private/settings/getSettings'
import { SetSettingsHandler } from './private/settings/setSettings'
import { InitAccountXpubsHandler } from './private/wallet/initAccountXpubs'
import { GetCoreReceiveAddressHandler } from './private/core/getCoreReceiveAddress'
import { ListCoreAddressesHandler } from './private/core/listCoreAddresses'
import { GetCoreBalanceHandler } from './private/core/getCoreBalance'
import { SendCoreTransferHandler } from './private/core/sendCoreTransfer'
import { CorePendingSpendsRepository } from '../repository/CorePendingSpendsRepository'
import { GeneratePlatformAddressesHandler } from './private/wallet/generatePlatformAddresses'
import { ListPlatformAddressesHandler } from './private/wallet/listPlatformAddresses'
import { GetPlatformAddressesInfosHandler } from './private/wallet/getPlatformAddressesInfos'
import { SendPlatformTransferHandler } from './private/wallet/sendPlatformTransfer'
import { IdentityCreditTransferToAddressesHandler } from './private/wallet/identityCreditTransferToAddresses'
import { TopUpIdentityFromAddressHandler } from './private/wallet/topUpIdentityFromAddress'
import { WithdrawPlatformAddressToCoreHandler } from './private/wallet/withdrawPlatformAddressToCore'
import { RegisterIdentityFromAddressHandler } from './private/wallet/registerIdentityFromAddress'
import { FundPlatformAddressFromCoreHandler } from './private/wallet/fundPlatformAddressFromCore'
import { GenerateShieldedAddressesHandler } from './private/wallet/generateShieldedAddresses'
import { GetShieldedAddressesHandler } from './private/wallet/getShieldedAddresses'
import { GetShieldedBalanceHandler } from './private/wallet/getShieldedBalance'
import { InitShieldHandler } from './private/wallet/initShield'
import { ShieldToPoolHandler } from './private/wallet/shieldToPool'
import { SendShieldedTransferHandler } from './private/wallet/sendShieldedTransfer'
import { UnshieldToAddressHandler } from './private/wallet/unshieldToAddress'
import { WithdrawShieldedToCoreHandler } from './private/wallet/withdrawShieldedToCore'

/**
 * Handlers for a messages within extension context
 */
export class PrivateAPI {
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK
  storageAdapter: StorageAdapter

  constructor (sdk: DashPlatformSDK, coreSDK: DashCoreSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.coreSDK = coreSDK
    this.storageAdapter = storageAdapter
  }

  handlers: {
    [key: string]: APIHandler
  }

  async handleMessage (data: EventData): Promise<any> {
    const { method, payload } = data

    const handler = this.handlers[method]

    if (handler == null) {
      throw new Error(`Could not find handler for method ${method}`)
    }

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      throw new Error(`Invalid payload: ${validation}`)
    }

    return await handler.handle(data)
  }

  /**
   * Builds the handler table. Transport is deliberately NOT registered here —
   * the hosting context owns it (see src/offscreen/index.ts), so the same
   * PrivateAPI boots unchanged in Chrome's offscreen document and Firefox's
   * event page.
   */
  buildHandlers (): void {
    const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk)
    const walletRepository = new WalletRepository(this.storageAdapter, identitiesRepository)
    const keypairRepository = new KeypairRepository(this.storageAdapter, this.sdk)
    const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter)
    const appConnectRepository = new AppConnectRepository(this.storageAdapter)
    const assetLockFundingAddressesRepository = new AssetLockFundingAddressesRepository(this.storageAdapter)
    const walletSettingsRepository = new WalletSettingsRepository(this.storageAdapter)
    const corePendingSpendsRepository = new CorePendingSpendsRepository(this.storageAdapter)
    const coreExplorer = new CoreExplorerService()

    this.handlers = {
      [MessagingMethods.GET_STATUS]: new GetStatusHandler(this.storageAdapter, walletRepository),
      [MessagingMethods.SETUP_PASSWORD]: new SetupPasswordHandler(this.storageAdapter),
      [MessagingMethods.CHECK_PASSWORD]: new CheckPasswordHandler(this.storageAdapter),
      [MessagingMethods.SWITCH_IDENTITY]: new SwitchIdentityHandler(identitiesRepository, walletRepository),
      [MessagingMethods.GET_ALL_WALLETS]: new GetAllWalletsHandler(walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.IMPORT_IDENTITY]: new ImportIdentityHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.IMPORT_MASTERNODE_IDENTITY]: new ImportMasternodeIdentityHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.EXPORT_PRIVATE_KEY]: new ExportPrivateKeyHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.ADD_IDENTITY_PRIVATE_KEY]: new AddIdentityPrivateKey(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.REMOVE_IDENTITY_PRIVATE_KEY]: new RemoveIdentityPrivateKeyHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.GET_AVAILABLE_KEY_PAIRS]: new GetAvailableKeyPairs(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.GET_IDENTITIES]: new GetIdentitiesHandler(identitiesRepository),
      [MessagingMethods.GET_CURRENT_IDENTITY]: new GetCurrentIdentityHandler(walletRepository),
      [MessagingMethods.APPROVE_STATE_TRANSITION]: new ApproveStateTransitionHandler(stateTransitionsRepository, identitiesRepository, walletRepository, keypairRepository, this.storageAdapter, this.sdk),
      [MessagingMethods.GET_STATE_TRANSITION]: new GetStateTransitionHandler(stateTransitionsRepository),
      [MessagingMethods.REJECT_STATE_TRANSITION]: new RejectStateTransitionHandler(stateTransitionsRepository, walletRepository),
      [MessagingMethods.INIT_ACCOUNT_XPUBS]: new InitAccountXpubsHandler(walletRepository, this.sdk),
      [MessagingMethods.CREATE_WALLET]: new CreateWalletHandler(walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.REMOVE_WALLET]: new RemoveWalletHandler(walletRepository, this.storageAdapter),
      [MessagingMethods.SWITCH_WALLET]: new SwitchWalletHandler(walletRepository, this.storageAdapter),
      [MessagingMethods.SWITCH_NETWORK]: new SwitchNetworkHandler(walletRepository, this.storageAdapter, this.sdk),
      [MessagingMethods.RESYNC_IDENTITIES]: new ResyncIdentitiesHandler(identitiesRepository, walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.SET_WALLET_LABEL]: new SetWalletLabelHandler(walletRepository),
      [MessagingMethods.GET_APP_CONNECT]: new GetAppConnectHandler(appConnectRepository),
      [MessagingMethods.GET_ALL_APP_CONNECTS]: new GetAllAppConnectsHandler(appConnectRepository),
      [MessagingMethods.REMOVE_APP_CONNECT]: new RemoveAppConnectHandler(appConnectRepository),
      [MessagingMethods.APPROVE_APP_CONNECT]: new ApproveAppConnectHandler(appConnectRepository, this.storageAdapter),
      [MessagingMethods.REJECT_APP_CONNECT]: new RejectAppConnectHandler(appConnectRepository, this.storageAdapter),
      [MessagingMethods.REGISTER_USERNAME]: new RegisterUsernameHandler(identitiesRepository, walletRepository, keypairRepository, this.sdk),
      [MessagingMethods.CREATE_STATE_TRANSITION]: new CreateStateTransitionHandler(stateTransitionsRepository),
      [MessagingMethods.CREATE_IDENTITY_PRIVATE_KEY]: new CreateIdentityPrivateKeyHandler(walletRepository, identitiesRepository, keypairRepository, this.storageAdapter, stateTransitionsRepository, this.sdk),
      [MessagingMethods.REQUEST_ASSET_LOCK_FUNDING_ADDRESS]: new RequestAssetLockFundingAddressHandler(assetLockFundingAddressesRepository, walletRepository, this.sdk, this.storageAdapter),
      [MessagingMethods.REQUEST_TOP_UP_FUNDING_ADDRESS]: new RequestTopUpFundingAddressHandler(assetLockFundingAddressesRepository, walletRepository, coreExplorer, this.sdk, this.storageAdapter),
      [MessagingMethods.REGISTER_IDENTITY]: new RegisterIdentityHandler(
        walletRepository,
        identitiesRepository,
        assetLockFundingAddressesRepository,
        this.storageAdapter,
        this.sdk,
        this.coreSDK
      ),
      [MessagingMethods.TOP_UP_IDENTITY]: new TopUpIdentityHandler(
        walletRepository,
        identitiesRepository,
        assetLockFundingAddressesRepository,
        this.sdk,
        this.coreSDK
      ),
      [MessagingMethods.GET_SETTINGS]: new GetSettingsHandler(walletSettingsRepository),
      [MessagingMethods.SET_SETTINGS]: new SetSettingsHandler(walletSettingsRepository),
      [MessagingMethods.GET_CORE_RECEIVE_ADDRESS]: new GetCoreReceiveAddressHandler(walletRepository, coreExplorer, this.sdk),
      [MessagingMethods.LIST_CORE_ADDRESSES]: new ListCoreAddressesHandler(walletRepository, coreExplorer, this.sdk),
      [MessagingMethods.GET_CORE_BALANCE]: new GetCoreBalanceHandler(walletRepository, coreExplorer),
      [MessagingMethods.SEND_CORE_TRANSFER]: new SendCoreTransferHandler(walletRepository, corePendingSpendsRepository, coreExplorer, this.sdk, this.coreSDK),
      [MessagingMethods.GENERATE_PLATFORM_ADDRESSES]: new GeneratePlatformAddressesHandler(walletRepository, this.sdk),
      [MessagingMethods.LIST_PLATFORM_ADDRESSES]: new ListPlatformAddressesHandler(walletRepository, this.sdk),
      [MessagingMethods.GET_PLATFORM_ADDRESSES_INFOS]: new GetPlatformAddressesInfosHandler(this.sdk),
      [MessagingMethods.SEND_PLATFORM_TRANSFER]: new SendPlatformTransferHandler(walletRepository, this.sdk),
      [MessagingMethods.IDENTITY_CREDIT_TRANSFER_TO_ADDRESSES]: new IdentityCreditTransferToAddressesHandler(walletRepository, identitiesRepository, keypairRepository, this.sdk),
      [MessagingMethods.TOP_UP_IDENTITY_FROM_ADDRESS]: new TopUpIdentityFromAddressHandler(walletRepository, this.sdk),
      [MessagingMethods.WITHDRAW_PLATFORM_ADDRESS_TO_CORE]: new WithdrawPlatformAddressToCoreHandler(walletRepository, this.sdk),
      [MessagingMethods.REGISTER_IDENTITY_FROM_ADDRESS]: new RegisterIdentityFromAddressHandler(walletRepository, identitiesRepository, this.sdk),
      [MessagingMethods.FUND_PLATFORM_ADDRESS_FROM_CORE]: new FundPlatformAddressFromCoreHandler(walletRepository, assetLockFundingAddressesRepository, this.sdk, this.coreSDK),
      [MessagingMethods.GENERATE_SHIELDED_ADDRESSES]: new GenerateShieldedAddressesHandler(walletRepository, this.sdk),
      [MessagingMethods.GET_SHIELDED_ADDRESSES]: new GetShieldedAddressesHandler(walletRepository, this.sdk),
      [MessagingMethods.GET_SHIELDED_BALANCE]: new GetShieldedBalanceHandler(walletRepository, this.sdk),
      [MessagingMethods.INIT_SHIELD]: new InitShieldHandler(this.sdk),
      [MessagingMethods.SHIELD_TO_POOL]: new ShieldToPoolHandler(walletRepository, this.sdk),
      [MessagingMethods.SEND_SHIELDED_TRANSFER]: new SendShieldedTransferHandler(walletRepository, this.sdk),
      [MessagingMethods.UNSHIELD_TO_ADDRESS]: new UnshieldToAddressHandler(walletRepository, this.sdk),
      [MessagingMethods.WITHDRAW_SHIELDED_TO_CORE]: new WithdrawShieldedToCoreHandler(walletRepository, this.sdk)
    }
  }
}
