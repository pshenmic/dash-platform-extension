import React, { useRef, useEffect, useState } from 'react'
import { Button, ChevronIcon, DashLogo } from 'dash-ui-kit/react'
import { AutoSizingInput } from '../controls'
import { parseDecimalInput } from '../../../utils'

interface AmountInputSectionProps {
  amount: string
  equivalentAmount: string
  onAmountChange: (value: string) => void
  onEquivalentChange: (value: string) => void
  onQuickAmount: (percentage: number) => void
  selectedAsset: string
  equivalentCurrency: 'usd' | 'dash'
  onEquivalentCurrencyChange: (currency: 'usd' | 'dash') => void
  assetDecimals: number
}

export function AmountInputSection ({
  amount,
  equivalentAmount,
  onAmountChange,
  onEquivalentChange,
  onQuickAmount,
  selectedAsset,
  equivalentCurrency,
  onEquivalentCurrencyChange,
  assetDecimals
}: AmountInputSectionProps): React.JSX.Element {
  const [showEquivalentCurrencyMenu, setShowEquivalentCurrencyMenu] = useState(false)
  const currencyMenuRef = useRef<HTMLDivElement>(null)

  // Close currency menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (currencyMenuRef.current != null && !currencyMenuRef.current.contains(event.target as Node)) {
        setShowEquivalentCurrencyMenu(false)
      }
    }

    if (showEquivalentCurrencyMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEquivalentCurrencyMenu])

  const handleCurrencyChange = (currency: 'usd' | 'dash'): void => {
    setShowEquivalentCurrencyMenu(false)
    onEquivalentCurrencyChange(currency)
  }

  return (
    <div className='flex flex-col items-center gap-[1.125rem] py-3 w-full'>
      {/* Dual Input Row */}
      <div className='flex items-end justify-center gap-3 w-full max-w-full px-0'>
        {/* Main Amount Input */}
        <AutoSizingInput
          value={amount}
          onChange={onAmountChange}
          placeholder='0'
          useDefaultStyles={false}
          sizing='fill'
          containerClassName='flex-1 min-w-0'
          className='flex items-center gap-2 px-3 py-1 border-0 border-b border-solid border-[rgba(12,28,51,0.15)] rounded-xl'
          inputClassName='text-dash-primary-dark-blue font-["Space_Grotesk"] font-bold text-[2rem] leading-[1.2] placeholder:text-[rgba(12,28,51,0.2)]'
          onChangeFilter={(value) => {
            const parsed = parseDecimalInput(value, assetDecimals)
            return parsed ?? amount
          }}
          rightContent={
            <Button
              onClick={() => onQuickAmount(1)}
              variant='solid'
              colorScheme='lightBlue'
              size='sm'
              className='px-2 py-1 !min-h-0 text-[0.75rem] leading-[1.2] bg-[rgba(76,126,255,0.05)] text-dash-brand hover:bg-[rgba(76,126,255,0.1)] flex-shrink-0'
            >
              Max
            </Button>
          }
        />

        {/* Equivalent Input - Only for Credits */}
        {selectedAsset === 'credits' && (
          <AutoSizingInput
            value={equivalentAmount}
            onChange={onEquivalentChange}
            placeholder='0'
            useDefaultStyles={false}
            sizing='auto'
            containerClassName='flex-shrink-0 max-w-[40%]'
            className='flex items-center gap-2 px-2 pl-2 py-1 border-0 border-b border-solid border-[rgba(12,28,51,0.15)] rounded-xl h-8'
            inputClassName='text-dash-primary-dark-blue opacity-35 font-["Space_Grotesk"] font-medium text-[1rem] leading-[1.2] placeholder:text-[rgba(12,28,51,0.2)]'
            minWidth={48}
            onChangeFilter={(value) => {
              const decimals = equivalentCurrency === 'dash' ? 8 : 2
              const parsed = parseDecimalInput(value, decimals)
              return parsed ?? equivalentAmount
            }}
            rightContent={
              <div ref={currencyMenuRef} className='relative flex-shrink-0'>
                <div
                  className='flex items-center gap-1 px-1 py-1 rounded-[1.5rem] bg-[rgba(12,28,51,0.05)] cursor-pointer'
                  onClick={() => setShowEquivalentCurrencyMenu(!showEquivalentCurrencyMenu)}
                >
                  <div className='w-4 h-4 rounded-full bg-dash-brand flex items-center justify-center'>
                    {equivalentCurrency === 'usd'
                      ? <span className='text-white text-[0.625rem] font-medium'>$</span>
                      : <DashLogo className='w-2 h-2' color='white' />}
                  </div>
                  <ChevronIcon className='text-dash-primary-dark-blue w-2 h-1' />
                </div>

                {/* Currency Menu */}
                {showEquivalentCurrencyMenu && (
                  <div className='absolute top-full right-0 mt-1 flex flex-col gap-2 p-1 bg-[#F3F3F4] rounded-xl z-10'>
                    <div
                      className='w-4 h-4 rounded-full bg-dash-brand flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
                      onClick={() => handleCurrencyChange('dash')}
                    >
                      <DashLogo className='w-2 h-2' color='white' />
                    </div>
                    <div
                      className='w-4 h-4 rounded-full bg-dash-brand flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
                      onClick={() => handleCurrencyChange('usd')}
                    >
                      <span className='text-white text-[0.625rem] font-medium'>$</span>
                    </div>
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}
