export interface RequestStateTransitionApprovalResponse {
    hash: string
    status: 'pending' | 'approved' | 'rejected'
    redirectUrl: string
}
