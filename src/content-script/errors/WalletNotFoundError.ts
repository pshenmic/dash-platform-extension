export class WalletNotFoundError extends Error {
  constructor (message = 'Wallet not found. Please create a wallet first.') {
    super(message)
    this.name = 'WalletNotFoundError'
  }
}
