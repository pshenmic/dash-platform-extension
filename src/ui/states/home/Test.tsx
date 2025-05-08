import React from 'react'
import { cva } from 'class-variance-authority'

const testClasses = cva('btn-base', {
  variants: {
    state: {
      active: 'bg-green-500',
      disabled: 'bg-gray-500',
    },
  },
  defaultVariants: { state: 'active' },
});

export default function () {
  const isDisabled = false

  return (
    <div className={testClasses({ state: isDisabled ? 'disabled' : 'active' })}>
      Test
      <div className={'TestClass'}>TestClass</div>
    </div>
  )
}
