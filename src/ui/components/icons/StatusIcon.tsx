import React from 'react'
import {
  SuccessIcon,
  ErrorIcon,
  QueuedIcon,
  PooledIcon,
  BroadcastedIcon
} from './index'

/**
 * Available status keys for which an icon will be rendered.
 */
export type StatusKey =
  | 'SUCCESS'
  | 'FAIL'
  | 'QUEUED'
  | 'POOLED'
  | 'BROADCASTED'

/**
 * Props for the StatusIcon component.
 * Inherits all props of SuccessIcon (assumed representative of all icons),
 * plus a `status` field to choose which icon to render.
 */
export interface StatusIconProps
  extends Omit<React.ComponentProps<typeof SuccessIcon>, 'size' | 'color'> {
  /** Which status icon to show. */
  status: StatusKey
  /** Optional override for icon size. */
  size?: number
  /** Optional override for icon color. */
  color?: string
}

/**
 * Renders an icon corresponding to the given `status`.
 * If `status` is not recognized, returns null.
 */
export const StatusIcon: React.FC<StatusIconProps> = ({ status, ...props }) => {
  const map = {
    SUCCESS: SuccessIcon,
    FAIL: ErrorIcon,
    QUEUED: QueuedIcon,
    POOLED: PooledIcon,
    BROADCASTED: BroadcastedIcon
  } as const

  const IconComponent = map[status]

  return IconComponent ? <IconComponent {...props} /> : null
}

export default StatusIcon
