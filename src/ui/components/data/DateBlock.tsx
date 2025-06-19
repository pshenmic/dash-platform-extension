import React from 'react'
import { cva } from 'class-variance-authority'
import { CalendarIcon } from '../icons'
import TimeDelta from './TimeDelta'
// import { Tooltip } from '../ui/Tooltips'

const wrapperStyles = cva('')

const infoContainer = cva(
  'flex flex-wrap items-center whitespace-nowrap -mt-1 -mb-1'
)

const itemStyles = cva(
  'mt-1 mb-1 mr-2 last:mr-0'
)

export type DateBlockFormat = 'all' | 'deltaOnly' | 'dateOnly'

export interface DateBlockProps {
  /** Unix timestamp (ms), Date object, or parsable date string */
  timestamp: number | Date | string
  /** Display format: full date+delta, delta only, or date only */
  format?: DateBlockFormat
  /** Include hours and minutes in formatted date */
  showTime?: boolean
  /** Show a tooltip with relative time */
  showRelativeTooltip?: boolean
  /** Additional CSS classes for wrapper div */
  className?: string
}

/**
 * DateBlock component displays a date, optional calendar icon,
 * and relative time via TimeDelta. It can also show an optional
 * tooltip with the relative time when hovered.
 */
export const DateBlock: React.FC<DateBlockProps> = ({
  timestamp,
  format = 'all',
  showTime = false,
  showRelativeTooltip = false,
  className = ''
}) => {
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return null

  const modes = {
    all: { calendarIcon: true, date: true, delta: true },
    deltaOnly: { calendarIcon: false, date: false, delta: true },
    dateOnly: { calendarIcon: false, date: true, delta: false }
  } as const

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(showTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }

  const formattedDate = date.toLocaleDateString('en-GB', options)

  const tooltipContent = showRelativeTooltip
    ? <TimeDelta endDate={timestamp} showTimestampTooltip={false} />
    : null

  const content = (
    <div className={infoContainer()}>
      {modes[format].calendarIcon && (
        <CalendarIcon
          className={`${itemStyles()} w-[12px] h-[14px] text-gray-250`}
        />
      )}
      {modes[format].date && (
        <div className={`${itemStyles()} text-[0.813rem]`}>{formattedDate}</div>
      )}
      {modes[format].delta && (
        <div
          className={`${itemStyles()} inline-block px-[10px] py-[3px] border border-[rgba(147,170,178,0.4)] rounded-[4px] text-[var(--chakra-colors-gray-250)] text-[0.688rem]`}
        >
          <TimeDelta
            endDate={date}
            showTimestampTooltip={format !== 'all'}
          />
        </div>
      )}
    </div>
  )

  const wrapperClass = `${wrapperStyles()}${className ? ` ${className}` : ''}`

  return <div className={wrapperClass}>{content}</div>

  // return tooltipContent ? (
  //   <Tooltip placement="top" content={tooltipContent}>
  //     <div className={wrapperClass}>{content}</div>
  //   </Tooltip>
  // ) : (
  //   <div className={wrapperClass}>{content}</div>
  // )
}

export default DateBlock
