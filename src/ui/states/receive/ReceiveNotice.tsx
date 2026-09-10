import React from 'react'
import { InfoCard } from '../../components/common'
import {
  RECEIVE_CORE_LAYER_NOTICE,
  RECEIVE_PLATFORM_LAYER_NOTICE
} from '../../constants/transferWarnings'
import type { ReceiveTarget } from './types'

interface ReceiveNoticeProps {
  target: ReceiveTarget
}

/** What must not be sent here. Sits above the QR, before anything gets scanned. */
export function ReceiveNotice ({ target }: ReceiveNoticeProps): React.JSX.Element {
  const notice = target.layer === 'Core' ? RECEIVE_CORE_LAYER_NOTICE : RECEIVE_PLATFORM_LAYER_NOTICE

  return (
    <InfoCard appearance='plain' backgroundColor='surface' title={notice.title}>
      {notice.text}
    </InfoCard>
  )
}
