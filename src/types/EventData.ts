export interface EventData {
  id: string
  // always dash-platform-extension
  context: string
  method: string
  payload?: any
  error?: any
  type: 'request' | 'response' | 'event'
}
