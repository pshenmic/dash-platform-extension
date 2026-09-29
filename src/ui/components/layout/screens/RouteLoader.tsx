import React from 'react'
import { useMatches } from 'react-router-dom'
import ScreenLoader from './ScreenLoader'

interface LoaderMatch {
  handle?: {
    loader?: React.ComponentType
  }
}

/** Loading state of the current route: the `handle.loader` set in the router, or the spinner. */
export default function RouteLoader (): React.JSX.Element {
  const matches = useMatches() as LoaderMatch[]
  const Loader = [...matches].reverse().find(match => match.handle?.loader != null)?.handle?.loader ?? ScreenLoader

  return <Loader />
}
