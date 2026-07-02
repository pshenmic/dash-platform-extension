import React, { useMemo } from 'react'
import styles from './PercentageSlider.module.pcss'

interface PercentageSliderProps {
  /** Raw amount string (same units as maxBalance) */
  amount: string
  /** Max available balance as plain number string */
  maxBalance: string | null
  /** Called with percentage 0-1 (like handleQuickAmount) */
  onPercentage: (percentage: number) => void
  /** Called when user explicitly clears (sets to 0) */
  onClear: () => void
  className?: string
}

export function PercentageSlider ({
  amount,
  maxBalance,
  onPercentage,
  onClear,
  className
}: PercentageSliderProps): React.JSX.Element {
  const sliderValue = useMemo((): number => {
    if (maxBalance == null || maxBalance === '' || amount === '' || amount === '.') return 0
    const numAmount = Number(amount)
    const numMax = Number(maxBalance)
    if (isNaN(numAmount) || isNaN(numMax) || numMax === 0) return 0
    return Math.min(100, Math.max(0, Math.round((numAmount / numMax) * 100)))
  }, [amount, maxBalance])

  const handleChange = (pct: number): void => {
    if (pct === 0) {
      onClear()
      return
    }
    onPercentage(pct / 100)
  }

  // `--pct` drives the filled portion of the track (see the CSS module).
  const sliderStyle: React.CSSProperties & Record<'--pct', string> = { '--pct': `${sliderValue}%` }

  return (
    <div className={`flex items-center gap-[1.125rem] w-full ${className ?? ''}`}>
      <button
        type='button'
        className='text-[0.75rem] font-medium leading-[1.2] text-brand border-none bg-transparent cursor-pointer p-0 rounded shrink-0'
        onClick={() => handleChange(0)}
      >
        0
      </button>

      <div className='flex-1 min-w-0'>
        <input
          type='range'
          min={0}
          max={100}
          value={sliderValue}
          onChange={(e) => handleChange(Number(e.target.value))}
          className={`${styles.slider} w-full block`}
          style={sliderStyle}
        />
      </div>

      <button
        type='button'
        className='text-[0.75rem] font-medium leading-[1.2] text-brand bg-[rgba(76,126,255,0.05)] border-none cursor-pointer px-2 py-1 rounded shrink-0'
        onClick={() => handleChange(100)}
      >
        Max
      </button>
    </div>
  )
}
