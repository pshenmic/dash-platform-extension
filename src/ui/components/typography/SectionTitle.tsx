import React from 'react'

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  className
}) => {
  return (
    <h1 className={`h1-title ${className ?? ''}`}>
      {children}
    </h1>
  )
}
