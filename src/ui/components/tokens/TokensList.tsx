import React from 'react'
import { Text, BigNumber } from 'dash-ui/react'
import { TokenData, NetworkType } from '../../hooks/usePlatformExplorerApi'
import { getTokenName } from '../../../utils'

interface TokensListProps {
  tokens: TokenData[]
  loading: boolean
  error: string | null
  selectedNetwork: NetworkType
}

function TokensList({ 
  tokens, 
  loading, 
  error, 
  selectedNetwork 
}: TokensListProps): React.JSX.Element {
  console.log('tokens', tokens)

  const getTokenInitials = (token: TokenData): string => {
    // Get singular form name and use first 2 characters
    const singularName = getTokenName(token.localizations, 'singularForm')
    if (singularName) {
      return singularName.substring(0, 2).toUpperCase()
    }
    
    // Fallback to description
    if (token.description) {
      return token.description.substring(0, 2).toUpperCase()
    }
    
    // Last fallback to identifier
    return token.identifier.substring(0, 2).toUpperCase()
  }

  return (
    <div className='w-full flex flex-col gap-2.5'>
      {loading && (
        <div className='text-center py-4'>
          <Text className='text-gray-500'>Loading tokens...</Text>
        </div>
      )}

      {error && (
        <div className='text-center py-4'>
          <Text className='text-red-500'>Error loading tokens: {error}</Text>
        </div>
      )}

      {!loading && !error && (!tokens || tokens.length === 0) && (
        <div className='text-center py-4'>
          <Text className='text-gray-500'>No tokens found</Text>
        </div>
      )}

      {!loading && !error && tokens && tokens.length > 0 && (
        <>
          {tokens.map((token) => {
            const initials = getTokenInitials(token)
            const singularName = getTokenName(token.localizations, 'singularForm') || token.description || 'Unknown Token'
            const pluralName = getTokenName(token.localizations, 'pluralForm') || singularName
            const balance = token.totalSupply

            return (
              <div
                key={token.identifier}
                className='flex items-center justify-between gap-4 p-[10px_15px] bg-[rgba(12,28,51,0.03)] rounded-[15px] w-[390px]'
              >
                {/* Left side */}
                <div className='flex items-center gap-3'>
                  {/* Token Avatar */}
                  <div className='flex items-center justify-center w-[39px] h-[39px] bg-[rgba(12,28,51,0.03)] rounded-full'>
                    <Text 
                      weight='medium' 
                      size='base'
                      className='text-[#0C1C33] text-center'
                      style={{ fontSize: '16px', lineHeight: '1.366em' }}
                    >
                      {initials}
                    </Text>
                  </div>

                  {/* Token Info */}
                  <div className='flex items-center gap-2 w-[121px]'>
                    <div className='flex flex-col'>
                      <Text 
                        weight='medium' 
                        size='sm' 
                        className='text-[#0C1C33]'
                        style={{ fontSize: '14px', lineHeight: '1.366em' }}
                      >
                        {singularName}
                      </Text>
                    </div>
                  </div>
                </div>

                <div className='flex items-end gap-1 text-[0.875rem] text-dash-primary-dark-blue text-right'>
                  <BigNumber className='font-extrabold'>{balance}</BigNumber>
                  <Text size='sm'>{pluralName}</Text>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default TokensList
