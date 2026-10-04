import * as mock from './mocks/transferApiMock'

// Single entry point of the send wizard for transfer API calls, real or mocked.
export const transferApi = {
  listCoreUtxos: mock.listCoreUtxos,
  estimateCoreFee: mock.estimateCoreFee,
  sendCoreTransaction: mock.sendCoreTransaction,
  topUpIdentityFromCore: mock.topUpIdentityFromCore,
  fundPlatformAddressFromWallet: mock.fundPlatformAddressFromWallet,
  shieldFromCore: mock.shieldFromCore,
  getTransferOperation: mock.getTransferOperation,
  listPendingTransferOperations: mock.listPendingTransferOperations,
  retryTransferOperation: mock.retryTransferOperation,
  sendPlatformTransferFromInputs: mock.sendPlatformTransfer,
  withdrawPlatformAddressToCoreFromInputs: mock.withdrawPlatformAddressToCore,
  listShieldedNotes: mock.listShieldedNotes,
  sendShieldedTransferFromNotes: mock.sendShieldedTransfer,
  unshieldToAddressFromNotes: mock.unshieldToAddress,
  withdrawShieldedToCoreFromNotes: mock.withdrawShieldedToCore,
  estimateWithdrawalFee: mock.estimateWithdrawalFee
}
