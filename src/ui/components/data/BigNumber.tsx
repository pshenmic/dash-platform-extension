import React from 'react'
import { cva } from 'class-variance-authority'

export type BigNumberVariant = 'space' | 'comma'

export interface BigNumberProps {
  /** The numeric value (or string) to format. */
  children?: number | string
  /** Use non-breaking space groups or comma groups. */
  variant?: BigNumberVariant
  /** Extra class names to apply to the wrapper. */
  className?: string
}

const bigNumberStyles = cva('inline-flex whitespace-nowrap')
const spaceStyles = cva('inline-block w-[3px]')

/**
 * Splits a numeric string into groups of three characters for display.
 * Supports two variants:
 * - `space`: groups separated by a fixed 3px block
 * - `comma`: groups separated by commas, with decimal part after `.`
 */
export const BigNumber: React.FC<BigNumberProps> = ({ children, variant = 'space', className = '' }) => {
  if (children === undefined || children === null) return null
  const str = children.toString()

  if (variant === 'space') {
    // group digits every 3, right to left
    const groups = str
      .split('')
      .reverse()
      .reduce<string[]>((acc, char, idx) => {
      if (idx % 3 === 0) acc.unshift('')
      acc[0] = char + acc[0]
      return acc
    }, [])

    return (
      <span className={`${bigNumberStyles()} ${className}`}>
        {groups.map((grp, i) => (
          <span key={i}>
            <span>{grp}</span>
            {i < groups.length - 1 && <span className={spaceStyles()} />}
          </span>
        ))}
      </span>
    )
  } else {
    // comma variant
    const [intPart, fracPart] = str.split('.')
    const groups = intPart
      .split('')
      .reverse()
      .reduce<string[]>((acc, char, idx) => {
      if (idx % 3 === 0) acc.unshift('')
      acc[0] = char + acc[0]
      return acc
    }, [])

    return (
      <span className={`${bigNumberStyles()} ${className}`}>
        {groups.map((grp, i) => (
          <span key={i}>
            <span>{grp}</span>
            {i < groups.length - 1 && <span className='px-[0.125ch]'>,</span>}
          </span>
        ))}
        {fracPart != null && (
          <>
            <span className='px-[0.125ch]'>.</span>
            <span>{fracPart}</span>
          </>
        )}
      </span>
    )
  }
}

export default BigNumber
