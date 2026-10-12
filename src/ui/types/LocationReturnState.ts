export interface LocationReturnState {
  from?: string
}

export function locationReturnState (from: string): LocationReturnState {
  return { from }
}

export function locationReturnPath (state: unknown, fallback: string): string {
  const from = (state as LocationReturnState | null)?.from
  return from != null && from !== '' ? from : fallback
}
