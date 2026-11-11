import { AppConnectRepository } from '../repository/AppConnectRepository'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import type { AppConnect } from '../../types/AppConnect'

/**
 * Gate a request from a webpage on the connection that website was granted.
 *
 * Connecting is the one thing an unknown origin may ask for. Everything else
 * needs an approved connection, and the caller is handed it so that it can
 * serve only what this website was granted.
 *
 * Shared by the page-side and backend-side dispatchers so that moving a handler
 * across that boundary cannot quietly drop the check.
 */
export async function authorizeOrigin (
  method: string,
  appConnectRepository: AppConnectRepository,
  origin: string
): Promise<AppConnect | null> {
  const appConnect = await appConnectRepository.getByURL(origin)

  if (method !== MessagingMethods.CONNECT_APP && (appConnect == null || appConnect.status !== AppConnectStatus.approved)) {
    throw new Error(`Application on url ${origin} is not authorized`)
  }

  return appConnect
}
