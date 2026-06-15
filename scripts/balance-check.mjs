import { DashPlatformSDK } from 'dash-platform-sdk'

const sdk = new DashPlatformSDK({ network: 'mainnet' })
const id = '7NbAgwcTSaahNvXEzXpywti2yNpLJm521etkhdjpzzQg'

try {
  const balance = await sdk.identities.getIdentityBalance(id)
  const credits = balance.toString()
  const creditsNum = Number(balance)
  console.log('identity:', id)
  console.log('balance: ', credits, 'credits')
  console.log('         =', (creditsNum / 1e11).toFixed(11), 'DASH equivalent (1 DASH = 10^11 credits)')
} catch (e) {
  console.log('error:', e.message)
}
