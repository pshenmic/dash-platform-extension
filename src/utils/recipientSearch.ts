import { DashPlatformSDK } from 'dash-platform-sdk'
import type { NameStatus } from '../types'
import { validateIdentifier } from './index'

export interface RecipientSearchResult {
  identifier: string
  name?: string
  nameStatus?: NameStatus
}

/**
 * Search for recipients by identifier or DPNS name using only SDK
 * All names found in blockchain are considered valid ('ok' status)
 */
export const searchRecipients = async (
  searchQuery: string,
  sdk: DashPlatformSDK
): Promise<RecipientSearchResult[]> => {
  const query = searchQuery.trim()
  if (!query) return []

  const results: RecipientSearchResult[] = []

  // 1. Check if it's a valid identifier format
  if (validateIdentifier(query)) {
    try {
      const identity = await sdk.identities.getIdentityByIdentifier(query)
      
      if (identity) {
        try {
          const names = await sdk.names.searchByIdentity(query)
          // const firstName = names[0]?.properties?.normalizedLabel as string | undefined
          const [firstName] = names
          const nameLabel = firstName?.properties?.normalizedLabel as string | undefined
          console.log('nameLabel', nameLabel)

          results.push({
            identifier: query,
            name: nameLabel ? `${nameLabel}.dash` : undefined,
            nameStatus: nameLabel ? 'ok' : undefined
          })
        } catch {
          results.push({ identifier: query })
        }
      }
    } catch (error) {
      console.log('Identity not found:', query)
    }
  }

  // 2. Search by DPNS name
  if (query.length >= 2) {
    try {
      const fullName = query.includes('.dash') ? query : `${query}.dash`
      const nameDocuments = await sdk.names.searchByName(fullName)
      
      // Map documents to results
      for (const doc of nameDocuments) {
        const normalizedLabel = doc.properties?.normalizedLabel as string
        const ownerId = doc.ownerId
        
        if (!normalizedLabel || !ownerId) continue
        
        const identifierString = ownerId.base58()
        
        // Check if already added (avoid duplicates)
        if (!results.some(r => r.identifier === identifierString)) {
          results.push({
            identifier: identifierString,
            name: `${normalizedLabel}.dash`,
            nameStatus: 'ok'
          })
        }
      }
    } catch (error) {
      console.log('Failed to search by name:', error)
    }
  }

  return results
}

