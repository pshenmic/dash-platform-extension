import React from 'react'
import { DashLogo, Heading, Text } from 'dash-ui-kit/react'

interface TitleBlockProps {
  title: string | React.ReactNode
  description?: string
  logoSize?: string
  centered?: boolean
  titleSize?: 'xl' | '2xl' | '3xl'
  titleClassName?: string
  containerClassName?: string
}

export const TitleBlock: React.FC<TitleBlockProps> = ({
  title,
  description,
  logoSize = '3rem',
  centered = false,
  titleSize = '2xl',
  titleClassName,
  containerClassName
}) => {
  const baseContainerClass = `flex ${centered ? 'items-center' : ''} flex-col w-full gap-2.5 mb-6`

  const containerClass = containerClassName !== null && containerClassName !== undefined && containerClassName !== ''
    ? `${baseContainerClass} ${containerClassName}`
    : baseContainerClass

  return (
    <div className={containerClass}>
      <DashLogo containerSize={logoSize} />

      <Heading
        level={1}
        size={titleSize}
        className={titleClassName}
      >
        {title}
      </Heading>

      {description !== null && description !== undefined && description !== '' && (
        <div className='!leading-tight'>
          <Text size='sm' dim>
            {description}
          </Text>
        </div>
      )}
    </div>
  )
}
