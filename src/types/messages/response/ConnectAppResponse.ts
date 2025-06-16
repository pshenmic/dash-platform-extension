export type ConnectAppResponse = {
    redirectUrl: string
    status: 'pending' | 'approved' | 'rejected'
}
