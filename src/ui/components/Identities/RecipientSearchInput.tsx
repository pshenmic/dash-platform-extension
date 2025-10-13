import React, { useState, useEffect, useRef } from 'react'
import {
  Avatar,
  Text,
  CircleProcessIcon,
  ErrorIcon,
  Identifier,
  SearchIcon,
  ValueCard
} from 'dash-ui-kit/react'
import { useSdk } from '../../hooks'
import { searchRecipients, type RecipientSearchResult, normalizeName } from '../../../utils'

interface RecipientSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (recipient: RecipientSearchResult) => void
  currentIdentity: string | null
  placeholder?: string
  error?: string | null
}

export function RecipientSearchInput ({
  value,
  onChange,
  onSelect,
  currentIdentity,
  placeholder = 'Enter recipient identity identifier or name',
  error
}: RecipientSearchInputProps): React.JSX.Element {
  const sdk = useSdk()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RecipientSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<RecipientSearchResult | null>(null)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value.trim() !== '' && (selectedResult == null)) {
        setIsSearchActive(true)
        void handleSearch(value).catch(console.error)
      } else if (value.trim() === '') {
        setSearchResults([])
        setIsSearchActive(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value, selectedResult])

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
    ? (selectedResult.name != null
        ? normalizeName(selectedResult.name, sdk) + '.dash'
        : selectedResult.identifier)
    : value
  const showSearchResults = isSearchActive && (selectedResult == null) && value.trim() !== ''

  // Filter out current identity from results
  const filteredResults = searchResults.filter(
    result => result.identifier !== currentIdentity
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
            {/* Avatar Prefix */}
            <div className={`${(selectedResult != null) ? 'w-5' : 'w-0'} h-5 flex items-center justify-center transition-all overflow-hidden`}>
              {(selectedResult != null) && (
                <Avatar
                  username={selectedResult.identifier}
                  className='w-5 h-5'
                />
              )}
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              value={displayValue}
              onChange={handleInputChange}
              placeholder={placeholder}
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
            {isSearching
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
