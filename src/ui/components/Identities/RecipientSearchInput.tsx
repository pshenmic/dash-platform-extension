import React, { useState, useEffect, useRef } from 'react'
import {
  Avatar,
  Text,
  CircleProcessIcon,
  ErrorIcon,
  Identifier,
  SearchIcon,
  ShieldSmallIcon,
  ValueCard
} from 'dash-ui-kit/react'
import { useSdk, useDebounce } from '../../hooks'
import { searchRecipients, type RecipientSearchResult, type RecipientTargetType, normalizeName, detectRecipientType } from '../../../utils'
import type { NetworkType } from '../../../types'

interface RecipientSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (recipient: RecipientSearchResult) => void
  excludeIdentifier: string | null
  placeholder?: string
  error?: string | null
  // When true, a valid transparent platform address typed into the field becomes
  // a selectable result. Requires `network` to classify the input.
  allowPlatformAddress?: boolean
  // When true, a valid Core (L1) base58check address becomes a selectable result
  // (withdrawals leave Platform for L1).
  allowCoreAddress?: boolean
  // When true, an Orchard shielded address becomes a selectable result.
  allowShieldAddress?: boolean
  // Recipients offered outright (not searched) — e.g. the wallet's own shielded
  // pool. Shown in the empty field so they're discoverable without typing.
  pinnedRecipients?: RecipientSearchResult[]
  network?: NetworkType
}

// Label shown above a typed-address result, per recipient type.
const ADDRESS_RESULT_LABELS: Record<string, string> = {
  platformAddress: 'Platform address:',
  coreAddress: 'Core (L1) address:',
  shieldAddress: 'Shielded address:'
}

// Shown when the typed value is a valid address of a type this sender can't pay.
const UNSUPPORTED_ADDRESS_MESSAGES: Record<string, string> = {
  platformAddress: 'Platform addresses are not supported for this transfer',
  coreAddress: 'Core (L1) withdrawals are only available from a platform or shielded balance',
  shieldAddress: 'Shielded addresses can only be paid from your shielded balance'
}

export function RecipientSearchInput ({
  value,
  onChange,
  onSelect,
  excludeIdentifier,
  placeholder = 'Enter recipient identity identifier or name',
  error,
  allowPlatformAddress = false,
  allowCoreAddress = false,
  allowShieldAddress = false,
  pinnedRecipients = [],
  network = 'testnet'
}: RecipientSearchInputProps): React.JSX.Element {
  const sdk = useSdk()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RecipientSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<RecipientSearchResult | null>(null)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedValue = useDebounce(value, 300)

  // Handle search with debounce
  useEffect(() => {
    if (debouncedValue.trim() !== '' && selectedResult == null) {
      setIsSearchActive(true)
      void handleSearch(debouncedValue).catch(console.error)
    } else if (debouncedValue.trim() === '') {
      setSearchResults([])
      setIsSearchActive(false)
    }
  }, [debouncedValue, selectedResult])

  const handleSearch = async (query: string): Promise<void> => {
    setIsSearching(true)
    try {
      const results = await searchRecipients(query, sdk)
      setSearchResults(results)
    } catch (err) {
      console.log('Search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectResult = (result: RecipientSearchResult): void => {
    setSelectedResult(result)
    onChange(result.identifier)
    onSelect(result)
    setIsSearchActive(false)
    setSearchResults([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedResult(null)

    if (newValue.trim() === '') {
      setSearchResults([])
      setIsSearchActive(false)
    }
  }

  const handleSearchIconClick = (): void => {
    if (selectedResult != null) {
      // Re-enable search mode
      setSelectedResult(null)
      setIsSearchActive(true)
      if (value.trim() !== '') {
        void handleSearch(value).catch(console.error)
      }
      inputRef.current?.focus()
    }
  }

  const displayValue = selectedResult != null
    ? (selectedResult.label ??
        (selectedResult.name != null
          ? normalizeName(selectedResult.name, sdk) + '.dash'
          : selectedResult.identifier))
    : value

  // Classify the typed value to surface an address result (or an unsupported-type
  // hint) alongside identity search results.
  const detectAddresses = allowPlatformAddress || allowCoreAddress || allowShieldAddress
  const recipientType = detectAddresses ? detectRecipientType(value, network) : 'identity'
  const isAddressType = recipientType === 'platformAddress' || recipientType === 'coreAddress' || recipientType === 'shieldAddress'
  const isAllowedAddress =
    (recipientType === 'platformAddress' && allowPlatformAddress) ||
    (recipientType === 'coreAddress' && allowCoreAddress) ||
    (recipientType === 'shieldAddress' && allowShieldAddress)
  const isExcludedAddress = isAddressType && value.trim() === excludeIdentifier
  const addressResult: RecipientSearchResult | null = (isAllowedAddress && !isExcludedAddress)
    ? { identifier: value.trim(), type: recipientType as RecipientTargetType }
    : null
  // A recognized address type this screen can't send to — explain instead of
  // silently showing "No results found".
  const unsupportedAddress = isAddressType && !isAllowedAddress && !isExcludedAddress

  // Pinned recipients are an entry point, not a search result: shown in the empty
  // field as a suggestion, they step aside the moment the user types.
  const showPinned = pinnedRecipients.length > 0 && selectedResult == null && value.trim() === ''

  const showSearchResults = selectedResult == null && (
    showPinned ||
    (value.trim() !== '' && (isSearchActive || addressResult != null || unsupportedAddress || isExcludedAddress))
  )

  // Filter out the sender from results — can't send to oneself.
  const filteredResults = searchResults.filter(
    result => result.identifier !== excludeIdentifier
  )

  return (
    <div ref={containerRef} className='relative'>
      {/* Expanded Container with Input and Search Results */}
      <div className={`border border-dash-primary-dark-blue/35 rounded-[0.9375rem] bg-white transition-all ${
        showSearchResults ? 'pb-5' : ''
      } ${(error !== null && error !== undefined) ? 'border-red-500' : (selectedResult != null) ? 'border-green-500' : ''}`}
      >

        {/* Input Section */}
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-3 px-[1.5625rem] py-[1.25rem]'>
            {selectedResult?.type === 'identity' && (
              <div className={`${selectedResult?.type === 'identity' ? 'w-5' : 'w-0'} h-5 flex items-center justify-center transition-all overflow-hidden`}>

                <Avatar
                  username={selectedResult.identifier}
                  className='w-5 h-5'
                />
              </div>
            )}

            {/* Input Field */}
            <input
              ref={inputRef}
              value={displayValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              spellCheck={false}
              className='flex-1 text-sm font-light text-dash-primary-dark-blue outline-none bg-transparent font-dash-grotesque'
            />

            {/* Status Icons */}
            <div className='flex items-center gap-2'>
              {(error !== null && error !== undefined)
                ? <ErrorIcon className='w-4 h-4 text-red-500' />
                : (
                  <button
                    onClick={handleSearchIconClick}
                    className='w-4 h-4 flex items-center justify-center opacity-35 hover:opacity-60 transition-opacity cursor-pointer'
                    aria-label='Search'
                  >
                    <SearchIcon className='text-dash-primary-dark-blue w-4 h-4' />
                  </button>
                  )}
            </div>
          </div>

          {/* Selected Identifier Display */}
          {(selectedResult?.name != null) && (
            <div className='px-[1.5625rem] pb-3'>
              <Identifier
                highlight='both'
                className='text-xs'
                disableCopy
              >
                {selectedResult.identifier}
              </Identifier>
            </div>
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className='max-h-[18.75rem] overflow-y-auto'>
            {showPinned
              ? (
                <div className='flex flex-col gap-2 px-6'>
                  {pinnedRecipients.map(pinned => (
                    <div
                      key={pinned.identifier}
                      onClick={() => handleSelectResult(pinned)}
                      className='flex items-center gap-3 p-[1rem] rounded-[1rem] bg-dash-primary-dark-blue/[0.03] hover:bg-dash-primary-dark-blue/[0.08] cursor-pointer transition-colors'
                    >
                      <div className='w-[1.875rem] h-[1.875rem] shrink-0 flex items-center justify-center bg-dash-primary-dark-blue/5 rounded-full'>
                        <ShieldSmallIcon size={14} className='text-dash-primary-dark-blue opacity-50' />
                      </div>
                      <div className='flex flex-col gap-0.5 min-w-0'>
                        <Text size='sm' className='text-dash-primary-dark-blue'>
                          {pinned.label ?? pinned.identifier}
                        </Text>
                        <Text className='text-xs' dim>
                          Move credits into your own private balance
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
                )
              : unsupportedAddress
                ? (
                  <div className='py-4 text-center px-6'>
                    <Text size='sm' className='text-dash-primary-dark-blue opacity-50'>
                      {(recipientType === 'shieldAddress' && pinnedRecipients.length > 0)
                        ? 'Credits can only be shielded into your own pool — clear the field and pick “My shielded balance”'
                        : UNSUPPORTED_ADDRESS_MESSAGES[recipientType] ?? 'This address type is not supported here'}
                    </Text>
                  </div>
                  )
                : isExcludedAddress
                  ? (
                    <div className='py-4 text-center px-6'>
                      <Text size='sm' className='text-dash-primary-dark-blue opacity-50'>
                        Recipient must be different from the sender
                      </Text>
                    </div>
                    )
                  : addressResult != null
                    ? (
                      <div className='flex flex-col gap-2 px-6'>
                        <div
                          onClick={() => handleSelectResult(addressResult)}
                          className='flex flex-col gap-2.5 p-[1rem] rounded-[1rem] bg-dash-primary-dark-blue/[0.03] hover:bg-dash-primary-dark-blue/[0.08] cursor-pointer transition-colors'
                        >
                          <div className='flex flex-col gap-1'>
                            <Text className='text-xs' dim>{ADDRESS_RESULT_LABELS[recipientType] ?? 'Address:'}</Text>
                            <Identifier highlight='both' className='text-xs' disableCopy>
                              {addressResult.identifier}
                            </Identifier>
                          </div>
                        </div>
                      </div>
                      )
                    : isSearching
                      ? (
                        <div className='flex items-center justify-center py-4'>
                          <CircleProcessIcon className='w-5 h-5 text-blue-500 animate-spin' />
                          <Text size='sm' className='ml-2 text-dash-primary-dark-blue opacity-50'>
                            Searching...
                          </Text>
                        </div>
                        )
                      : filteredResults.length > 0
                        ? (
                          <div className='flex flex-col gap-2 px-6'>
                            {filteredResults.map((result, index) => (
                              <div
                                key={`${result.identifier}-${index}`}
                                onClick={() => handleSelectResult(result)}
                                className='flex flex-col gap-3 p-[1rem] rounded-[1rem] bg-dash-primary-dark-blue/[0.03] hover:bg-dash-primary-dark-blue/[0.08] cursor-pointer transition-colors'
                              >
                                <div className='flex flex-col gap-2.5'>
                                  <Identifier
                                    avatar
                                    highlight='both'
                                    className='text-xs'
                                  >
                                    {result.identifier}
                                  </Identifier>
                                  {(result.name != null) && (
                                    <div className='flex items-baseline gap-2'>
                                      <Text className='text-xs' dim>
                                        Name:
                                      </Text>
                                      <ValueCard border={false} colorScheme='lightGray' size='xs' className='text-xs text-dash-primary-dark-blue'>
                                        <Text size='sm' monospace className='!text-dash-primary-dark-blue'>
                                          {normalizeName(result.name, sdk)}
                                        </Text>
                                        <Text size='sm' monospace className='!text-dash-brand'>
                                          .dash
                                        </Text>
                                      </ValueCard>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          )
                        : (
                          <div className='py-4 text-center'>
                            <Text size='sm' className='text-dash-primary-dark-blue opacity-50'>
                              No results found
                            </Text>
                          </div>
                          )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {(error !== null && error !== undefined) && (
        <Text size='sm' className='text-red-500 mt-2'>
          {error}
        </Text>
      )}
    </div>
  )
}
