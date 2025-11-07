import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text, OverlayMenu, ExternalLinkIcon, AirplaneIcon } from 'dash-ui-kit/react'
import { TokenData, NetworkType } from '../../hooks/usePlatformExplorerApi'
import { getTokenName, fromBaseUnit } from '../../../utils'
import { PLATFORM_EXPLORER_URLS } from '../../../constants'
import EntityList from '../common/EntityList'
import EntityListItem from '../common/EntityListItem'
import { BigNumberDisplay } from '../data'

interface TokensListProps {
  tokens: TokenData[]
  loading: boolean
  error: string | null
  currentNetwork: NetworkType
}

function TokensList ({
  tokens,
  loading,
  error,
  currentNetwork
}: TokensListProps): React.JSX.Element {
  const navigate = useNavigate()
  const [openMenuTokenId, setOpenMenuTokenId] = useState<string | null>(null)

  const getTokenInitials = (token: TokenData): string => {
    const singularName = getTokenName(token.localizations, 'singularForm')
    if (singularName !== '' && singularName != null) {
      return singularName.substring(0, 2).toUpperCase()
    }

    if (token.description !== '' && token.description != null) {
      return token.description.substring(0, 2).toUpperCase()
    }

    return token.identifier.substring(0, 2).toUpperCase()
  }

  const getTokenExplorerUrl = (tokenIdentifier: string): string => {
    const explorerBaseUrl = PLATFORM_EXPLORER_URLS[currentNetwork].explorer
    return `${explorerBaseUrl}/token/${tokenIdentifier}`
  }

  const handleTokenClick = useCallback((e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>, tokenId: string) => {
    e.stopPropagation()
    setOpenMenuTokenId(prevId => prevId === tokenId ? null : tokenId)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setOpenMenuTokenId(null)
  }, [])

  return (
    <EntityList
      loading={loading}
      error={error}
      isEmpty={(tokens == null) || tokens.length === 0}
      variant='tight'
      loadingText='Loading tokens...'
      errorText={(error != null && error !== '') ? `Error loading tokens: ${error}` : undefined}
      emptyText='No tokens found'
    >
      {tokens.map((token) => {
        const initials = getTokenInitials(token)
        const singularName = getTokenName(token.localizations, 'singularForm') ?? (token.description !== '' ? token.description : 'Unknown Token')
        const pluralName = getTokenName(token.localizations, 'pluralForm') ?? singularName
        const balance = fromBaseUnit(token.balance, token.decimals)
        const isMenuOpen = openMenuTokenId === token.identifier

        return (
          <div key={token.identifier} className='relative'>
            <EntityListItem
              onClick={(e) => handleTokenClick(e, token.identifier)}
            >
              <div className='flex items-center gap-3'>
                <div className='flex items-center justify-center w-[2.438rem] h-[2.438rem] bg-[rgba(12,28,51,0.03)] rounded-full'>
                  <Text
                    weight='medium'
                    className='text-dash-primary-dark-blue text-center text-[1rem] leading-[1.366em]'
                  >
                    {initials}
                  </Text>
                </div>

                <div className='flex items-center gap-2 w-[121px]'>
                  <div className='flex flex-col'>
                    <Text
                      weight='medium'
                      className='text-dash-primary-dark-blue text-[0.875rem] leading-[1.366em]'
                    >
                      {singularName}
                    </Text>
                  </div>
                </div>
              </div>

              <div className='flex items-end gap-1 text-dash-primary-dark-blue text-right'>
                {balance != null ? <BigNumberDisplay className='!font-extrabold !text-[0.875rem]'>{balance}</BigNumberDisplay> : '-'}
                <Text size='sm'>{pluralName}</Text>
              </div>
            </EntityListItem>

            {isMenuOpen && (
              <div className='absolute top-1/2 left-full z-50'>
                <OverlayMenu
                  variant='context-menu'
                  contentClassName='!translate-x-[-110%] !translate-y-[-50%]'
                  size='xl'
                  width={200}
                  showCloseButton
                  onClose={handleCloseMenu}
                  items={[
                    {
                      id: 'view-explorer',
                      content: (
                        <div className='flex items-center gap-2'>
                          <ExternalLinkIcon size={16} />
                          <Text weight='medium' className='!text-[0.75rem]'>View on Explorer</Text>
                        </div>
                      ),
                      onClick: () => {
                        window.open(getTokenExplorerUrl(token.identifier), '_blank', 'noopener,noreferrer')
                        handleCloseMenu()
                      }
                    },
                    {
                      id: 'transfer',
                      content: (
                        <div className='flex items-center gap-2'>
                          <AirplaneIcon size={16} />
                          <Text weight='medium' className='!text-[0.75rem]'>Transfer</Text>
                        </div>
                      ),
                      onClick: () => {
                        handleCloseMenu()
                        void navigate('/send-transaction', {
                          state: {
                            selectedToken: token.identifier
                          }
                        })
                      }
                    }
                  ]}
                />
              </div>
            )}
          </div>
        )
      })}
    </EntityList>
  )
}

export default TokensList
