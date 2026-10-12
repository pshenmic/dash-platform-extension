// Tells whether the back button has an entry of ours to pop back to.

interface RouterHistoryState {
  idx?: number
}

/**
 * react-router keeps the index of the current entry within this app session in
 * history.state.idx: it starts at 0 on load, grows on push and stays put on
 * replace. window.history.length counts the whole tab instead, including pages
 * that were open before the extension UI.
 */
export const hasAppHistory = (): boolean => {
  const idx = (window.history.state as RouterHistoryState | null)?.idx

  return typeof idx === 'number' && idx > 0
}
