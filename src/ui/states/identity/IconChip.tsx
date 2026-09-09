import React from 'react'

export const iconChipClassName = 'flex items-center justify-center size-6 p-1 rounded-[5px] bg-[rgba(12,28,51,0.05)] shrink-0 transition-colors hover:bg-[rgba(12,28,51,0.12)]'

interface IconChipProps {
  label: string
  href?: string
  onClick?: (event: React.MouseEvent) => void
  children: React.ReactNode
}

export function IconChip ({ label, href, onClick, children }: IconChipProps): React.JSX.Element {
  const hasHref = href != null && href !== ''

  return hasHref
    ? (
      <a
        href={href}
        target='_blank'
        rel='noreferrer'
        aria-label={label}
        className={iconChipClassName}
        onClick={onClick}
      >
        {children}
      </a>
      )
    : (
      <div className={iconChipClassName} onClick={onClick} aria-label={label}>
        {children}
      </div>
      )
}
