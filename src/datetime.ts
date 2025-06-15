/**
 * Acceptable inputs for date parameters.
 */
export type DateInput = Date | string | number

/**
 * Returns the number of whole days between two dates.
 * Rounds up any partial day.
 *
 * @param startDate - The start date (Date | ISO string | timestamp)
 * @param endDate   - The end date (Date | ISO string | timestamp)
 * @returns Number of days difference, or 0 if either date is missing/invalid
 */
export function getDaysBetweenDates(
  startDate?: DateInput,
  endDate?: DateInput
): number {
  if (startDate == null || endDate == null) return 0

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  const diffMs = Math.abs(end.getTime() - start.getTime())
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return days
}

/**
 * Creates a dynamic ISO-range from now back by `duration` milliseconds.
 *
 * @param duration - Time span in milliseconds
 * @returns Object with `start` and `end` ISO date strings
 */
export function getDynamicRange(duration: number): {
  start: string
  end: string
} {
  const now = new Date()
  const end = now.toISOString()
  const start = new Date(now.getTime() - duration).toISOString()
  return { start, end }
}

/**
 * Allowed formats for time delta output.
 */
export type TimeDeltaFormat = 'default' | 'detailed'

/**
 * Returns a human-readable difference between two dates.
 *
 * - `default`: largest unit with suffix (`"2d ago"`, `"5h left"`, etc.)
 * - `detailed`: full breakdown as `"Xd:Yh:Zm"`
 *
 * If inputs are invalid, returns `"n/a"` or `"Invalid format"`.
 *
 * @param startDate - The start date (Date | ISO string | timestamp)
 * @param endDate   - The end date (Date | ISO string | timestamp)
 * @param format    - `'default'` or `'detailed'`
 * @returns A string describing the time delta
 */
export function getTimeDelta(
  startDate: DateInput,
  endDate: DateInput,
  format: TimeDeltaFormat = 'default'
): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'n/a'
  }

  const diffMs = end.getTime() - start.getTime()
  const isFuture = diffMs > 0
  const absMs = Math.abs(diffMs)

  const days = Math.floor(absMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((absMs % (1000 * 60)) / 1000)

  if (format === 'default') {
    const suffix = isFuture ? 'left' : 'ago'
    if (days > 0) {
      return `${days}d ${suffix}`
    }
    if (hours > 0) {
      return `${hours}h ${suffix}`
    }
    if (minutes > 0) {
      return `${minutes} min. ${suffix}`
    }
    return `${seconds} sec. ${suffix}`
  }

  if (format === 'detailed') {
    return `${days}d:${hours}h:${minutes}m`
  }

  return 'Invalid format'
}
