import React from 'react'
import { OverlayMenu, Text } from 'dash-ui-kit/react'
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

/** Badge plus label, with the L1/L2 suffix dimmed as in the mockup. */
function EndpointTypeRow ({ type, hint }: { type: EndpointType, hint?: string }): React.JSX.Element {
  const layer = endpointLayer(type)

  return (
    <div className='flex items-center gap-2.5 min-w-0'>
      <LayerBadge layer={layer} />
      <div className='flex flex-col min-w-0'>
        <Text size='sm' weight='medium' className='truncate'>
          {ENDPOINT_TYPE_LABELS[type]}
          {layer !== 'shielded' && <span className='text-dash-primary-dark-blue/35'> ({layer})</span>}
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
      triggerContent={<EndpointTypeRow type={value} />}
      items={options.map(option => ({
        id: option.type,
        disabled: option.disabled,
        content: <EndpointTypeRow type={option.type} hint={option.disabled === true ? option.hint : undefined} />,
        onClick: () => { onChange(option.type) }
      }))}
      size='md'
      colorScheme='lightGray'
      filled
      showArrow
      disabled={disabled}
      className={`!w-full ${className ?? ''}`}
    />
  )
}
