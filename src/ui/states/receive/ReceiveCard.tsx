import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CopyButton, ExternalLinkIcon, Identifier, Text } from 'dash-ui-kit/react'
import { IconChip } from '../../components/common'
import type { ReceiveTarget } from './types'

interface ReceiveCardProps {
  target: ReceiveTarget
}

/** QR plus the full address, the two things a sender actually needs. */
export function ReceiveCard ({ target }: ReceiveCardProps): React.JSX.Element {
  return (
    <div className='flex flex-col items-center gap-4 rounded-[14px] px-[15px] py-5 bg-[rgba(12,28,51,0.04)]'>
      <div className='p-4 rounded-2xl bg-white'>
        <QRCodeSVG
          value={target.value}
          fgColor='#4C7EFF'
          bgColor='transparent'
          size={160}
        />
      </div>

      <div className='flex items-start gap-2 w-full min-w-0'>
        <Identifier highlight='both' className='!text-sm !leading-[1.2] flex-1'>
          {target.value}
        </Identifier>
        {target.explorerUrl != null && (
          <IconChip label='View in explorer' href={target.explorerUrl}>
            <ExternalLinkIcon size={14} color='#000000' />
          </IconChip>
        )}
        <IconChip label='Copy address'>
          <CopyButton
            text={target.value}
            aria-label='Copy address'
            className='!p-0 !bg-transparent [&_svg]:!size-3.5'
          />
        </IconChip>
      </div>

      <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/35 !text-center'>
        Scan the code or copy the address to receive {target.unit} here.
      </Text>
    </div>
  )
}
