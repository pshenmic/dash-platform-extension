import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface FieldLabelProps {
  children: React.ReactNode
  required?: boolean
  className?: string
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  children,
  required,
  className
}) => {
  return (
    <Text dim className={className}>
      {children}
      {required && <span className='text-red-500 ml-1'>*</span>}
    </Text>
  )
}
