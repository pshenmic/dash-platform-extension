import type { SendScope } from '../states/sendTransaction/types'

// Scope and identity live in the URL so the screen survives a reload and keeps
// knowing which dashboard it was opened from.
export function sendPath (scope: SendScope = 'all', identityId?: string): string {
  const params = new URLSearchParams({ scope })

  if (scope === 'identity' && identityId != null && identityId !== '') {
    params.set('identity', identityId)
  }

  return `/send-transaction?${params.toString()}`
}

export function parseSendScope (value: string | null): SendScope {
  if (value === 'core' || value === 'platform' || value === 'identity') return value

  return 'all'
}
