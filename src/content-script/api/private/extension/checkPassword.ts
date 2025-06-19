import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { CheckPasswordPayload } from '../../../../types/messages/payloads/CheckPasswordPayload'
import { CheckPasswordResponse } from '../../../../types/messages/response/CheckPasswordResponse'

export class CheckPasswordHandler implements APIHandler {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<CheckPasswordResponse> {
    const payload: CheckPasswordPayload = event.payload

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey')

    if (!passwordPublicKey) {
      throw new Error('Password is not set')
    }

    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    const success = secretKey.publicKey.toHex() === passwordPublicKey

    return { success }
  }

  validatePayload (payload: CheckPasswordPayload): string | null {
    if (!payload.password) {
      return 'Password must be included in the payload'
    }

    return null
  }
}
