export interface EventData {
    id: string
    // always dash-platform-extension
    context: string
    target: string
    method: string
    payload?: any
    error?: any
}
