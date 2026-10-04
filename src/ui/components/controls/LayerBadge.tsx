import React from 'react'
import { Badge, ShieldSmallIcon } from 'dash-ui-kit/react'
import type { EndpointType } from '../../states/sendTransaction/types'

export type LayerType = 'L1' | 'L2' | 'shielded'

const ENDPOINT_LAYERS: Record<EndpointType, LayerType> = {
  core: 'L1',
  identity: 'L2',
  platformAddress: 'L2',
  shielded: 'shielded'
}

/** Network layer a transfer endpoint type lives on. */
export function endpointLayer (type: EndpointType): LayerType {
  return ENDPOINT_LAYERS[type]
}

interface LayerBadgeProps {
  layer: LayerType
  className?: string
}

/** Small blue square marking the layer: L1, L2 or a shield for the shielded pool. */
export function LayerBadge ({ layer, className }: LayerBadgeProps): React.JSX.Element {
  return (
    <Badge
      color='blue'
      variant='flat'
      size='xxs'
      className={`!rounded-[0.375rem] w-6 h-6 shrink-0 !p-0 !text-[0.625rem] !leading-none ${className ?? ''}`}
    >
      {layer === 'shielded'
        ? <ShieldSmallIcon color='currentColor' className='w-3 h-3' />
        : layer}
    </Badge>
  )
}
