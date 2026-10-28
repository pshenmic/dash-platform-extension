import { AssetLockFundingPurpose, PendingAssetLockSchema } from '../content-script/storage/storageSchema'

// Who an unfinished asset lock was meant for. Each purpose fills exactly one of
// these, and a registration or a shield into the wallet's own pool fills none.
export const assetLockRecipient = (entry: PendingAssetLockSchema): string | null => {
  return entry.identityId ?? entry.platformAddress ?? entry.shieldedAddress ?? null
}

/**
 * The operation to continue when the same one is asked for again: an asset lock
 * of this purpose, for this recipient, whose Platform side never finished.
 *
 * Starting a fresh one instead would pay a second time and leave the first
 * lock's credits with nothing to spend them on, so a chain that funds itself
 * looks here before it reserves anything. The oldest match wins: it is the one
 * that has been waiting longest for its credits.
 */
export const findUnfinishedAssetLock = (
  pending: PendingAssetLockSchema[],
  purpose: AssetLockFundingPurpose,
  recipient: string | null
): PendingAssetLockSchema | null => {
  const matching = pending
    .filter(entry => entry.purpose === purpose && assetLockRecipient(entry) === recipient)
    .sort((a, b) => a.createdAt - b.createdAt)

  return matching[0] ?? null
}
