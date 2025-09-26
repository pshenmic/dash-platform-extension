import { DashPlatformSDK } from 'dash-platform-sdk'
import { type NameData } from '../ui/components/names'
import type { NetworkType, PlatformExplorerClient } from '../types'

export const normalizeName = (name: string, sdk?: DashPlatformSDK): string => {
  const nameWithoutDash = name.replace(/\.dash$/, '')
  return sdk?.names.normalizeLabel(nameWithoutDash) ?? nameWithoutDash
}

export const fetchNames = async (
  sdk: DashPlatformSDK,
  platformExplorerClient: PlatformExplorerClient,
  identityId: string,
  currentNetwork: NetworkType
): Promise<NameData[]> => {
  let sdkNames: NameData[] = []
  let platformNames: NameData[] = []

  try {
    const sdkNamesResult = await sdk.names.searchByIdentity(identityId)

    sdkNames = sdkNamesResult.map(doc => {
      const normalizedLabel = doc.properties?.normalizedLabel || ''

      return {
        name: `${normalizedLabel}.dash`,
        registrationTime: doc.createdAt ? new Date(Number(doc.createdAt)).toISOString() : null,
        status: 'ok' as const
      }
    })
  } catch (error) {
    console.log('Failed to fetch names from SDK:', error)
  }

  try {
    const platformResult = await platformExplorerClient.fetchNames(identityId, currentNetwork)

    if (platformResult.data != null) {
      const sdkNameLabels = new Set(
        sdkNames.map(nameData => normalizeName(nameData.name, sdk)).filter(Boolean)
      )

      platformNames = platformResult.data
        .filter(platformName => !sdkNameLabels.has(normalizeName(platformName.name, sdk))) as NameData[]
    }
  } catch (platformError) {
    console.warn('Failed to fetch names from platform client', platformError)
  }

  return [
    ...sdkNames,
    ...platformNames
  ]
}
