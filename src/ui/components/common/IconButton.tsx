import React from 'react'

export type IconButtonVariant = 'solid' | 'subtle'

interface IconButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
  variant?: IconButtonVariant
}

const variantClassName: Record<IconButtonVariant, string> = {
  solid: 'w-[27px] h-[27px] bg-[rgba(12,28,51,0.12)] hover:bg-[rgba(12,28,51,0.18)]',
  subtle: 'w-6 h-6 bg-[rgba(12,28,51,0.04)] hover:bg-[rgba(12,28,51,0.1)]'
}

/** Square icon-only button */
export function IconButton ({ label, onClick, children, variant = 'solid' }: IconButtonProps): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className={`${variantClassName[variant]} flex items-center justify-center rounded-lg cursor-pointer transition-colors`}
    >
      {children}
    </button>
  )
}
