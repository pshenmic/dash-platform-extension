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
  middleButton?: ButtonConfig
  className?: string
}

export default function ButtonRow ({ leftButton, rightButton, middleButton, className }: ButtonRowProps): React.JSX.Element {
  const buttonClass = middleButton != null ? 'flex-1' : 'w-1/2'

  return (
    <div className={`flex gap-2 w-full ${className ?? ''}`}>
      <Button
        onClick={leftButton.onClick}
        colorScheme={leftButton.colorScheme}
        className={buttonClass}
        disabled={leftButton.disabled ?? false}
      >
        {leftButton.text}
      </Button>
      {middleButton != null && (
        <Button
          onClick={middleButton.onClick}
          colorScheme={middleButton.colorScheme}
          className={buttonClass}
          disabled={middleButton.disabled ?? false}
        >
          {middleButton.text}
        </Button>
      )}
      <Button
        onClick={rightButton.onClick}
        colorScheme={rightButton.colorScheme}
        className={buttonClass}
        disabled={rightButton.disabled ?? false}
      >
        {rightButton.text}
      </Button>
    </div>
  )
}
