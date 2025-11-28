import React from 'react'
import { Button } from 'dash-ui-kit/react'

type ButtonProps = React.ComponentProps<typeof Button>

interface ButtonConfig {
  text: string
  onClick: () => void
  colorScheme?: ButtonProps['colorScheme']
  disabled?: boolean
}

interface ButtonRowProps {
  leftButton: ButtonConfig
  rightButton: ButtonConfig
  className?: string
}

export default function ButtonRow ({ leftButton, rightButton, className }: ButtonRowProps): React.JSX.Element {
  const handleLeftClick = leftButton.onClick
  const handleRightClick = rightButton.onClick

  return (
    <div className={`flex gap-2 w-full ${className ?? ''}`}>
      <Button
        onClick={handleLeftClick}
        colorScheme={leftButton.colorScheme}
        className='w-1/2'
        disabled={leftButton.disabled ?? false}
      >
        {leftButton.text}
      </Button>
      <Button
        onClick={handleRightClick}
        colorScheme={rightButton.colorScheme}
        className='w-1/2'
        disabled={rightButton.disabled ?? false}
      >
        {rightButton.text}
      </Button>
    </div>
  )
}
