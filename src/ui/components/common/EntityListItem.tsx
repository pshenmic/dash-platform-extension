import React from 'react'

interface EntityListItemProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
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
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick()
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
