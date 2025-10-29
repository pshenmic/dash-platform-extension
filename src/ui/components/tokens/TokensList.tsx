import React from 'react'
import { Text } from 'dash-ui-kit/react'
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

  return (
    <EntityList
      loading={loading}
      error={error}
      isEmpty={(tokens == null) || tokens.length === 0}
      variant='tight'
      loadingText='Loading tokens...'
      errorText={(error != null && error !== '') ? `Error loading tokens: ${error}` : undefined}
      emptyText='No tokens on this Identity yet'
    >
      {tokens.map((token) => {
        const initials = getTokenInitials(token)
        const singularName = getTokenName(token.localizations, 'singularForm') ?? (token.description !== '' ? token.description : 'Unknown Token')
        const pluralName = getTokenName(token.localizations, 'pluralForm') ?? singularName
        const balance = fromBaseUnit(token.balance, token.decimals)

        return (
          <EntityListItem
            key={token.identifier}
            href={getTokenExplorerUrl(token.identifier)}
          >
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-[2.438rem] h-[2.438rem] bg-[rgba(12,28,51,0.03)] rounded-full'>
                <Text
                  weight='medium'
                  size='base'
                  className='text-dash-primary-dark-blue text-center'
                  style={{ fontSize: '16px', lineHeight: '1.366em' }}
                >
                  {initials}
                </Text>
              </div>

              <div className='flex items-center gap-2 w-[121px]'>
                <div className='flex flex-col'>
                  <Text
                    weight='medium'
                    size='sm'
                    className='text-dash-primary-dark-blue'
                    style={{ fontSize: '14px', lineHeight: '1.366em' }}
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
        )
      })}
    </EntityList>
  )
}

export default TokensList
