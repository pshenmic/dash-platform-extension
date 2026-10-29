import { PaymentRoute } from './PaymentRoute'
import { PaymentAddressType, PaymentSourceType } from '../../../../types/PaymentRequest'

const RECIPIENTS: Record<PaymentAddressType, string> = {
  core: 'a Core address',
  platform: 'a Platform address',
  orchard: 'an Orchard address'
}

const SOURCES: Record<PaymentSourceType, string> = {
  core: 'Core',
  platform: 'Platform',
  orchard: 'shielded'
}

// Picks the route that pays a recipient of one layer from a source of another.
// A pair no route serves is refused by name, so a new route only has to be
// registered here to become payable.
export class PaymentRouter {
  routes: PaymentRoute[]

  constructor (routes: PaymentRoute[]) {
    this.routes = routes
  }

  get (source: PaymentSourceType, recipient: PaymentAddressType): PaymentRoute {
    const route = this.routes.find(route => route.source === source && route.recipient === recipient)

    if (route == null) {
      throw new Error(`Paying ${RECIPIENTS[recipient]} from ${SOURCES[source]} funds is not supported yet`)
    }

    return route
  }
}
