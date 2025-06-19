import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { SetupPasswordPayload } from '../../../../types/messages/payloads/SetupPasswordPayload'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

export class SetupPasswordHandler implements APIHandler {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SetupPasswordPayload = event.payload

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey')

    if (passwordPublicKey != null) {
      throw new Error('Password already set')
    }

    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    await this.storageAdapter.set('passwordPublicKey', secretKey.publicKey.toHex())

    return {}
  }

  validatePayload (payload: SetupPasswordPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be included in the payload'
    }

    return null
  }
}
