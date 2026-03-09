import React from 'react'
import { Button, ArrowIcon } from 'dash-ui-kit/react'

interface BackButtonProps {
  onClick: () => void
  className?: string
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, className }) => (
  <Button
    onClick={onClick}
    colorScheme='lightGray'
    className={`w-12 h-12 ${className ?? ''}`}
  >
    <ArrowIcon color='var(--color-dash-primary-dark-blue) w-5 h-5' />
  </Button>
)
