import { use } from 'react'
import type { DashPlatformSDK } from 'dash-platform-sdk'
import { getSdkPromise } from '../../utils/sdkLoader'

/**
 * Returns the Dash Platform SDK, suspending until it has loaded.
 *
 * The import must stay type-only here: a value import of `dash-platform-sdk`
 * pulls the 7.5MB WASM module into the initial `ui` chunk, where it is compiled
 * synchronously before React can paint anything. `getSdkPromise()` loads it in
 * an async chunk instead, and `use()` suspends to the nearest `<Suspense>` —
 * every route in `src/ui/index.tsx` has one — until it is ready.
 *
 * Callers rendered OUTSIDE a Suspense boundary (e.g. Layout) must not use this
 * hook; they should await `getSdkPromise()` inside a callback instead.
 */
export const useSdk = (): DashPlatformSDK => use(getSdkPromise())
