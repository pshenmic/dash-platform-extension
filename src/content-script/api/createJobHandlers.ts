import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { StorageAdapter } from '../storage/storageAdapter'
import { LongRunningHandler } from './LongRunningHandler'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { WalletRepository } from '../repository/WalletRepository'
import { ShieldToPoolHandler } from './private/wallet/shieldToPool'

// Builds the map of long-running handlers the offscreen JobExecutor runs, keyed
// by MessagingMethods. Mirrors the DI wiring in PrivateAPI.init for the job
// subset only; keep the two in sync as more methods move onto the job path.
// `coreSDK` is threaded through for handlers that touch L1 (asset lock / top-up)
// as they are added here.
export const createJobHandlers = (sdk: DashPlatformSDK, coreSDK: DashCoreSDK, storageAdapter: StorageAdapter): { [method: string]: LongRunningHandler } => {
  const identitiesRepository = new IdentitiesRepository(storageAdapter, sdk)
  const walletRepository = new WalletRepository(storageAdapter, identitiesRepository)

  return {
    [MessagingMethods.SHIELD_TO_POOL]: new ShieldToPoolHandler(walletRepository, sdk)
  }
}
