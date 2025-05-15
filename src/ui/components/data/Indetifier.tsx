import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  PropsWithChildren,
} from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import useResizeObserver from '@react-hook/resize-observer'
import useDebounce from '../../../hooks/useDebounce'
import { NotActive } from './NotActive'
import CopyButton from '../controls/buttons/CopyButton'

/** CVA for the root container */
const identifier = cva(
  'flex items-center font-mono text-sm font-normal break-all',
  {
    variants: {
      ellipsis: {
        false: '',
        true: 'overflow-hidden',
      },
      highlight: {
        default: '',
        dim: '',
        highlight: '',
        first: '',
        last: '',
        both: '',
      },
    },
    defaultVariants: {
      ellipsis: false,
      highlight: 'default',
    },
  }
)
type IdentifierVariants = VariantProps<typeof identifier>

/** CVA for each symbol span */
const symbol = cva('flex-1', {
  variants: {
    dim: {
      false: 'text-white',
      true:  'text-gray-300',
    },
  },
  defaultVariants: {
    dim: false,
  },
})

type HighlightMode = keyof typeof highlightModes
const highlightModes = {
  default:   { first: true,  middle: false, last: true  },
  dim:       { first: false, middle: false, last: false },
  highlight: { first: true,  middle: true,  last: true  },
  first:     { first: true,  middle: false, last: false },
  last:      { first: false, middle: false, last: true  },
  both:      { first: true,  middle: false, last: true  },
} as const

interface IdentifierProps extends IdentifierVariants {
  children?: string
  avatar?: boolean
  copyButton?: boolean
  linesAdjustment?: boolean
  className?: string
}

const HighlightedID: React.FC<PropsWithChildren<{ mode: HighlightMode }>> = ({ children, mode, }) => {
  if (!children) return <NotActive/>
  const text = String(children)
  const count = 5
  const first  = text.slice(0, count)
  const middle = text.slice(count, text.length - count)
  const last   = text.slice(-count)
  const cfg    = highlightModes[mode] || highlightModes.default

  return (
    <>
      <span className={symbol({ dim: !cfg.first  })}>{first}</span>
      <span className={symbol({ dim: !cfg.middle })}>{middle}</span>
      <span className={symbol({ dim: !cfg.last   })}>{last}</span>
    </>
  )
}

const Identifier: React.FC<IdentifierProps> = ({
  children,
  ellipsis,
  highlight,
  avatar,
  copyButton,
  linesAdjustment = true,
  className
}) => {
  const symbolsRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [charWidth, setCharWidth] = useState(0)
  const [linesMaxWidth, setLinesMaxWidth] = useState<'none' | string>('none')
  const [widthCounted, setWidthCounted] = useState(false)
  const prevWinRef = useRef<number | null>(null)
  const [winWidth, setWinWidth] = useState(0)
  const debouncedWin = useDebounce(winWidth, 500)

  // disable dynamic lines if ellipsis
  if (ellipsis) linesAdjustment = false

  useResizeObserver(symbolsRef, entry => {
    setContainerWidth(entry.contentRect.width)
  })

  const measureChar = useCallback(() => {
    if (!symbolsRef.current || !linesAdjustment) return 0
    const temp = document.createElement('span')
    const styles = getComputedStyle(symbolsRef.current)
    temp.style.position = 'absolute'
    temp.style.visibility = 'hidden'
    temp.style.fontFamily = styles.fontFamily
    temp.style.fontSize = styles.fontSize
    temp.style.fontWeight = styles.fontWeight
    temp.textContent = 'A'
    document.body.appendChild(temp)
    const w = temp.getBoundingClientRect().width
    document.body.removeChild(temp)
    return w
  }, [linesAdjustment])

  useEffect(() => {
    if (!symbolsRef.current || !linesAdjustment) return
    setCharWidth(measureChar() || 0)
  }, [measureChar])

  const updateSize = () => {
    if (widthCounted) return
    const len = children?.length || 0
    if (!charWidth || !containerWidth || !len) {
      setLinesMaxWidth('none')
      return
    }
    const spacingF = 0.1625
    const perLine  = Math.floor(containerWidth / charWidth + spacingF)
    if (perLine <= len / 8 || perLine > len) {
      setLinesMaxWidth('none')
      return
    }
    const lines  = Math.max(Math.ceil(len / perLine), 1)
    const adjust = 0.7
    const width  = charWidth * (len / lines + adjust)
    setLinesMaxWidth(`${width}px`)
    setWidthCounted(true)
  }

  useEffect(() => {
    if (!linesAdjustment) return
    if (
      debouncedWin !== prevWinRef.current ||
      !widthCounted ||
      prevWinRef.current === null
    ) {
      updateSize()
    }
    prevWinRef.current = debouncedWin
  }, [charWidth, containerWidth, debouncedWin])

  useEffect(() => {
    if (!linesAdjustment) return
    let prev = window.innerWidth
    const handler = () => {
      const cur = window.innerWidth
      if (cur !== prev) {
        setWinWidth(cur)
        setWidthCounted(false)
        prev = cur
      }
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const rootClass =
    identifier({ ellipsis, highlight }) +
    (className ? ` ${className}` : '')

  const symbolContainerClass = ellipsis
    ? 'flex-1 overflow-hidden whitespace-nowrap text-ellipsis'
    : 'flex-1 leading-[1rem]'

  return (
    <div className={rootClass}>
      {avatar && children && (
        <div className='w-6 h-6 rounded-full mr-2 flex-shrink-0'/>
      )}
      <div
        ref={symbolsRef}
        className={symbolContainerClass}
        style={{ maxWidth: widthCounted ? linesMaxWidth : 'none' }}
      >
        {children && highlight
          ? <HighlightedID mode={highlight}>{children}</HighlightedID>
          : (children || <NotActive/>)}
      </div>
      {copyButton && children && (
        <CopyButton className='ml-3' text={children}/>
      )}
    </div>
  )
}

export default Identifier
