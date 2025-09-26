import type { NameStatus } from '../../../types'

export interface NameStatusStyle {
  iconBg: string
  iconColor: string
  statusBg: string
  statusText: string
  statusLabel: string
}

export const nameStatusStyles: Record<NameStatus, NameStatusStyle> = {
  ok: {
    iconBg: 'bg-dash-brand/15',
    iconColor: 'text-dash-brand',
    statusBg: 'bg-dash-brand/15',
    statusText: '!text-dash-brand',
    statusLabel: 'Finished'
  },
  locked: {
    iconBg: 'bg-dash-red-5',
    iconColor: 'text-dash-red',
    statusBg: 'bg-dash-red-15',
    statusText: '!text-dash-red',
    statusLabel: 'Locked'
  },
  pending: {
    iconBg: 'bg-dash-orange-5',
    iconColor: 'text-dash-orange',
    statusBg: 'bg-dash-orange-15',
    statusText: '!text-dash-orange',
    statusLabel: 'Pending'
  }
}
