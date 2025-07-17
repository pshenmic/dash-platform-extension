import React from 'react'
import { useTheme } from 'dash-ui/react'

interface HeadingProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
  color?: 'black' | 'gray' | 'blue' | 'red' | 'green'
  className?: string
  children: React.ReactNode
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm', 
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-[2.375rem] leading-[1.3] tracking-[-0.3px]', // Current h1-title style
  '3xl': 'text-4xl'
}

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium', 
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold'
}

const colorClasses = {
  black: 'text-black',
  gray: 'text-gray-600',
  blue: 'text-blue-600', 
  red: 'text-red-600',
  green: 'text-green-600'
}

export const Heading: React.FC<HeadingProps> = ({ 
  as = 'h1',
  size = '2xl',
  weight = 'extrabold', 
  color = 'black',
  className = '',
  children
}) => {
  const Component = as
  
  const classes = [
    sizeClasses[size],
    weightClasses[weight],
    colorClasses[color],
    className
  ].filter(Boolean).join(' ')

  return (
    <Component className={classes}>
      {children}
    </Component>
  )
}

export type { HeadingProps } 