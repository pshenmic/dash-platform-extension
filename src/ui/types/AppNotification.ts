import type { UnfinishedOperation } from '../../utils'

// Item of the header notifications list; `type` picks how it renders and what it opens.
export type AppNotification =
  | { type: 'unfinishedOperation', id: string, operation: UnfinishedOperation }
