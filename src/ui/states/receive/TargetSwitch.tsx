import React from 'react'
import { Avatar, Identifier, OverlayMenu, Switch, Text } from 'dash-ui-kit/react'
import {
  PLATFORM_TARGET_TYPES,
  RECEIVE_TYPE_LABELS,
  receiveLayerOf,
  type ReceiveLayer,
  type ReceiveTarget,
  type ReceiveTargetType
} from './types'

const LAYER_OPTIONS = [
  { label: 'Core', value: 'core' as const },
  { label: 'Platform', value: 'platform' as const }
]

const TYPE_OPTIONS = PLATFORM_TARGET_TYPES.map(type => ({
  label: RECEIVE_TYPE_LABELS[type],
  value: type
}))

function TargetRow ({ target }: { target: ReceiveTarget }): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 min-w-0'>
      <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
        <Avatar username={target.value} className='w-6 h-6' />
      </div>
      <Identifier highlight='both' middleEllipsis edgeChars={5} className='!text-sm'>
        {target.value}
      </Identifier>
    </div>
  )
}

interface TargetSwitchProps {
  showPicker: boolean
  activeType: ReceiveTargetType
  targets: ReceiveTarget[]
  selected: ReceiveTarget | null
  onTypeChange: (type: ReceiveTargetType) => void
  onTargetChange: (target: ReceiveTarget) => void
}

/**
 * Destination picker, narrowing left to right: layer, then what type of
 * Platform destination, then which one. Each level appears only when it has a
 * choice to offer - an identity dashboard names its destination outright.
 */
export function TargetSwitch ({
  showPicker,
  activeType,
  targets,
  selected,
  onTypeChange,
  onTargetChange
}: TargetSwitchProps): React.JSX.Element | null {
  const layer = receiveLayerOf(activeType)
  const showMenu = targets.length > 1

  const changeLayer = (next: ReceiveLayer): void => {
    // Platform has no single destination, so entering it lands on addresses.
    onTypeChange(next === 'core' ? 'core' : 'platformAddress')
  }

  if (!showPicker && !showMenu) {
    return selected != null
      ? (
        <div className='flex items-center gap-[15px] p-3 rounded-[15px] bg-[rgba(12,28,51,0.04)]'>
          <TargetRow target={selected} />
        </div>
        )
      : null
  }

  return (
    <div className='flex flex-col gap-2'>
      {showPicker && (
        <Switch size='sm' options={LAYER_OPTIONS} value={layer} onChange={changeLayer} />
      )}

      {showPicker && layer === 'platform' && (
        <Switch size='sm' options={TYPE_OPTIONS} value={activeType} onChange={onTypeChange} />
      )}

      {showMenu && (
        <OverlayMenu
          overlayLabel='Destination'
          triggerContent={selected != null
            ? <TargetRow target={selected} />
            : <Text size='sm' weight='medium'>No destination yet</Text>}
          items={targets.map(target => ({
            id: target.value,
            content: <TargetRow target={target} />,
            onClick: () => { onTargetChange(target) }
          }))}
          size='md'
          border
          showArrow
          className='!w-full'
        />
      )}
    </div>
  )
}
