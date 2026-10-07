import React from 'react'
import { ChevronIcon, OverlayMenu, Text } from 'dash-ui-kit/react'
import { LayerBadge, endpointLayer } from '../controls'
import type { EndpointType } from '../../states/sendTransaction/types'

export const ENDPOINT_TYPE_LABELS: Record<EndpointType, string> = {
  core: 'Dash Core',
  identity: 'Platform Identity',
  platformAddress: 'Platform Address',
  shielded: 'Shielded Address'
}

export interface EndpointTypeOption {
  type: EndpointType
  disabled?: boolean
  hint?: string
}

interface EndpointTypeSelectProps {
  value: EndpointType
  options: EndpointTypeOption[]
  onChange: (type: EndpointType) => void
  disabled?: boolean
  className?: string
}

/** Badge plus label; the dimmed L1/L2 suffix is shown only in the list, the badge already marks the layer. */
function EndpointTypeRow ({ type, hint, showLayer = false }: { type: EndpointType, hint?: string, showLayer?: boolean }): React.JSX.Element {
  const layer = endpointLayer(type)

  return (
    <div className='flex items-center gap-2 min-w-0'>
      <LayerBadge layer={layer} className='!rounded-full !text-xs !font-extrabold' />
      <div className='flex flex-col min-w-0'>
        <Text size='sm' weight='medium' className='truncate'>
          {ENDPOINT_TYPE_LABELS[type]}
          {showLayer && layer !== 'shielded' && <span className='text-dash-primary-dark-blue/48 dark:text-white/48'> ({layer})</span>}
        </Text>
        {hint != null && (
          <Text size='xs' dim className='truncate'>
            {hint}
          </Text>
        )}
      </div>
    </div>
  )
}

/** Dropdown picking which type of endpoint a transfer goes from or to. */
export function EndpointTypeSelect ({
  value,
  options,
  onChange,
  disabled = false,
  className
}: EndpointTypeSelectProps): React.JSX.Element {
  return (
    <OverlayMenu
      triggerContent={(
        <div className='flex items-center justify-between gap-3 min-w-0'>
          <EndpointTypeRow type={value} />
          <ChevronIcon size={14} color='currentColor' className='shrink-0 text-dash-primary-dark-blue/48 dark:text-white/48' />
        </div>
      )}
      items={options.map(option => ({
        id: option.type,
        disabled: option.disabled,
        content: <EndpointTypeRow type={option.type} hint={option.disabled === true ? option.hint : undefined} showLayer />,
        onClick: () => { onChange(option.type) }
      }))}
      size='md'
      colorScheme='lightGray'
      filled
      border={false}
      showArrow={false}
      disabled={disabled}
      wrapperClassName={className}
      className='!w-full'
      triggerClassName='!h-[3.25rem] !px-3 !py-1.5 !rounded-2xl [&>div]:min-w-0'
    />
  )
}
