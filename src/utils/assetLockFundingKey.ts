import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import { Wallet } from '../types/Wallet'
import { AssetLockFundingAddressSchema } from '../content-script/storage/storageSchema'
import { hexToBytes } from './index'

// The funding key of an asset lock funding address this extension handed out.
// Stored encrypted to a key derived from the password, so reading it back is the
// one place the password is needed.
export const decryptAssetLockFundingKey = (entry: AssetLockFundingAddressSchema, password: string, network: Wallet['network']): PrivateKeyWASM => {
  const passwordHash = hash.sha256().update(password).digest('hex')
  const secretKey = PrivateKey.fromHex(passwordHash)

  let keyBytes: Uint8Array
  try {
    keyBytes = decrypt(secretKey.toHex(), hexToBytes(entry.encryptedPrivateKey))
  } catch {
    throw new Error('Failed to decrypt asset lock funding key - wrong password or corrupted entry')
  }

  return PrivateKeyWASM.fromBytes(keyBytes, network)
}
