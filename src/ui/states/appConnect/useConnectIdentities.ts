import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../types'

interface ConnectIdentities {
  identities: string[]
  selected: string[]
  allSelected: boolean
  toggle: (identifier: string) => void
  toggleAll: () => void
  // False until the wallet identities arrive; nothing should be granted before that.
  loaded: boolean
}

// Wallet identities and the ones picked to share with the website; all of them are picked by default.
export function useConnectIdentities (): ConnectIdentities {
  const { availableIdentities, identitiesLoaded } = useOutletContext<OutletContext>()
  const identities = availableIdentities.map(identity => identity.identifier)
  const [selected, setSelected] = useState<string[] | null>(null)

  useEffect(() => {
    if (selected != null || !identitiesLoaded) return
    setSelected(identities)
  }, [identitiesLoaded, identities, selected])

  const toggle = useCallback((identifier: string): void => {
    setSelected(prev => {
      const current = prev ?? []
      return current.includes(identifier) ? current.filter(id => id !== identifier) : [...current, identifier]
    })
  }, [])

  const picked = selected ?? []
  const allSelected = identities.length > 0 && identities.every(identifier => picked.includes(identifier))

  const toggleAll = (): void => setSelected(allSelected ? [] : identities)

  return { identities, selected: picked, allSelected, toggle, toggleAll, loaded: selected != null }
}
