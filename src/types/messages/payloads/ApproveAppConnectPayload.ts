export interface ApproveAppConnectPayload {
  id: string
  // Identities the website may see. Omitted means every identity of the wallet.
  identities?: string[]
}
