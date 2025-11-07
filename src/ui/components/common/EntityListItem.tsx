import React from 'react'

interface EntityListItemProps {
  children: React.ReactNode
  href?: string
  onClick?: (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void
  className?: string
}

function EntityListItem ({
  children,
  href,
  onClick,
  className = ''
}: EntityListItemProps): React.JSX.Element {
  const baseClasses = `entities-list-item ${className}`

  if (href !== null && href !== undefined) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className={baseClasses}
      >
        {children}
      </a>
    )
  }

  if (typeof onClick === 'function') {
    return (
      <div
        className={baseClasses}
        onClick={onClick}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick(e)
          }
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  )
}

export default EntityListItem
