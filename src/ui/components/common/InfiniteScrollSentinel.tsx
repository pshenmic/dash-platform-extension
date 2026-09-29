import React, { useEffect, useRef } from 'react'

interface InfiniteScrollSentinelProps {
  onVisible: () => void
  disabled?: boolean
  rootMargin?: string
}

// The popup scrolls in an ancestor container, not the viewport.
function findScrollParent (node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null

  while (current != null && current !== document.body) {
    const overflowY = window.getComputedStyle(current).overflowY

    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current
    }

    current = current.parentElement
  }

  return null
}

/**
 * Fires when scrolled into view. Only an accelerator - the caller must keep a
 * visible fallback control, since a short list never scrolls at all.
 */
export function InfiniteScrollSentinel ({
  onVisible,
  disabled = false,
  rootMargin = '0px 0px 240px 0px'
}: InfiniteScrollSentinelProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onVisible)

  callbackRef.current = onVisible

  useEffect(() => {
    const node = ref.current
    if (disabled || node == null || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) callbackRef.current()
    }, { root: findScrollParent(node), rootMargin })

    observer.observe(node)

    return () => { observer.disconnect() }
  }, [disabled, rootMargin])

  return <div ref={ref} aria-hidden className='h-px w-full' />
}

export default InfiniteScrollSentinel
