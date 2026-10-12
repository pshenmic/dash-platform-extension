import type { ReceiveScope, ReceiveTargetType } from '../states/receive/types'

interface ReceiveTargetRef {
  type: ReceiveTargetType
  value?: string
}

// Scope and target live in the URL so the screen survives a reload and stays shareable.
export function receivePath (scope: ReceiveScope = 'all', target?: ReceiveTargetRef): string {
  const params = new URLSearchParams({ scope })

  if (target != null) {
    params.set('type', target.type)

    if (target.value != null && target.value !== '') {
      params.set('value', target.value)
    }
  }

  return `/receive?${params.toString()}`
}

export function parseReceiveScope (value: string | null): ReceiveScope {
  if (value === 'core' || value === 'platform' || value === 'identity') return value

  return 'all'
}

export function parseReceiveTargetType (value: string | null): ReceiveTargetType | null {
  if (value === 'core' || value === 'platformAddress' || value === 'shielded' || value === 'identity') {
    return value
  }

  return null
}
