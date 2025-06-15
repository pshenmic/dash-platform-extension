import React, { useEffect, useState } from 'react'
import { cva } from 'class-variance-authority'
import { NotActive } from './NotActive'
import {getTimeDelta} from "../../../datetime";
// import { Tooltip } from '../ui/Tooltips'

const wrapperStyles = cva('inline')
// const tooltipContentStyles = cva('tracking-[0.8px]')

type TimeDeltaFormat = 'default' | 'detailed'

export interface TimeDeltaProps {
  /** Start date for delta calculation, defaults to now */
  startDate?: Date | number | string
  /** End date or timestamp */
  endDate: Date | number | string
  /** Show tooltip with exact timestamp */
  showTimestampTooltip?: boolean
  /** Override date for tooltip instead of endDate */
  tooltipDate?: Date | number | string
  /** Format mode: 'default' shows delta and tooltip, 'detailed' suppresses tooltip */
  format?: TimeDeltaFormat
}

/**
 * TimeDelta component renews a human-readable delta string periodically,
 * and optionally wraps it in a tooltip showing the exact date/time.
 */
export const TimeDelta: React.FC<TimeDeltaProps> = ({
  startDate,
  endDate,
  showTimestampTooltip = true,
  tooltipDate,
  format = 'default',
}) => {
  const [timeDelta, setTimeDelta] = useState<string | null>(null)
  const tooltipDateObj = new Date(tooltipDate ?? endDate)

  useEffect(() => {
    if (!endDate) {
      setTimeDelta(null)
      return
    }

    let timeoutId: ReturnType<typeof setTimeout>

    const updateDelta = () => {
      const start = startDate ? new Date(startDate) : new Date()
      const end = new Date(endDate)
      setTimeDelta(getTimeDelta(start, end, format))

      const now = new Date()
      const diffMs = Math.abs(end.getTime() - now.getTime())
      if (diffMs > 60_000) {
        const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
        timeoutId = setTimeout(updateDelta, msToNextMinute)
      } else {
        timeoutId = setTimeout(updateDelta, 1000)
      }
    }

    updateDelta()

    return () => clearTimeout(timeoutId)
  }, [startDate, endDate, format])

  if (!timeDelta) {
    return <NotActive />
  }

  // const showTooltip = showTimestampTooltip && format !== 'detailed' && !isNaN(tooltipDateObj.getTime())
  const content = <span className={wrapperStyles()}>{timeDelta}</span>

  // if (showTooltip) {
  //   return (
  //     <Tooltip
  //       placement="top"
  //       content={
  //         <span className={tooltipContentStyles()}>
  //           {tooltipDateObj.toLocaleDateString()}{' '}{tooltipDateObj.toLocaleTimeString()}
  //         </span>
  //       }
  //     >
  //       {content}
  //     </Tooltip>
  //   )
  // }

  return content
}

export default TimeDelta
