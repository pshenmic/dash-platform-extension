import React from 'react'
import { Badge } from 'dash-ui-kit/react'
import type { EndpointType } from '../../states/sendTransaction/types'

export type LayerType = 'L1' | 'L2'

const ENDPOINT_LAYERS: Record<EndpointType, LayerType> = {
  core: 'L1',
  identity: 'L2',
  platformAddress: 'L2',
  shielded: 'L2'
}

/** Network layer a transfer endpoint type lives on. */
export function endpointLayer (type: EndpointType): LayerType {
  return ENDPOINT_LAYERS[type]
}

interface LayerBadgeProps {
  layer: LayerType
  shape?: 'square' | 'circle'
  className?: string
}

/** Small blue square marking the layer: L1 or L2. */
export function LayerBadge ({ layer, shape = 'square', className }: LayerBadgeProps): React.JSX.Element {
  return (
    <Badge
      color='blue'
      variant='flat'
      size='icon'
      shape={shape}
      className={className}
    >
      {layer}
    </Badge>
  )
}
