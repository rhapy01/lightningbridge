const BLINK_API = 'https://api.blink.sv/graphql'

type BlinkResult<T> = { data?: T; errors?: Array<{ message?: string }> }

async function blinkGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(BLINK_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error('Blink could not process the request.')
  const result = await response.json() as BlinkResult<T>
  if (!result.data || result.errors?.length) throw new Error('Blink could not process the request.')
  return result.data
}

export async function createBlinkInvoice(username: string, amountSats: number, memo: string) {
  const walletData = await blinkGraphql<{
    accountDefaultWallet?: { id?: string; walletCurrency?: string }
  }>(
    'query ($username: Username!, $walletCurrency: WalletCurrency) { accountDefaultWallet(username: $username, walletCurrency: $walletCurrency) { id walletCurrency } }',
    { username, walletCurrency: 'BTC' },
  )
  const walletId = walletData.accountDefaultWallet?.id
  if (!walletId || walletData.accountDefaultWallet?.walletCurrency !== 'BTC') {
    throw new Error('Could not find a BTC wallet for that Blink username.')
  }

  const invoiceData = await blinkGraphql<{
    lnInvoiceCreateOnBehalfOfRecipient?: {
      errors?: Array<{ message?: string }>
      invoice?: { paymentRequest?: string; satoshis?: number | string; paymentStatus?: string }
    }
  }>(
    'mutation ($input: LnInvoiceCreateOnBehalfOfRecipientInput!) { lnInvoiceCreateOnBehalfOfRecipient(input: $input) { errors { message } invoice { paymentRequest satoshis paymentStatus } } }',
    { input: { amount: String(amountSats), memo: memo || 'LightningBridge payment', recipientWalletId: walletId } },
  )
  const payload = invoiceData.lnInvoiceCreateOnBehalfOfRecipient
  const invoice = payload?.invoice
  if (payload?.errors?.length || !invoice?.paymentRequest) {
    throw new Error(payload?.errors?.[0]?.message || 'Blink did not return a Lightning invoice.')
  }
  if (!invoice.paymentRequest.toLowerCase().startsWith('lnbc')) {
    throw new Error('Blink returned an invoice that is not for Bitcoin mainnet.')
  }
  if (Number(invoice.satoshis) !== amountSats || invoice.paymentStatus !== 'PENDING') {
    throw new Error('Blink returned an invoice with an unexpected amount or status.')
  }
  return invoice.paymentRequest
}

export async function getBlinkInvoiceStatus(paymentRequest: string) {
  const data = await blinkGraphql<{
    lnInvoicePaymentStatusByPaymentRequest?: { paymentRequest?: string; status?: string }
  }>(
    'query ($input: LnInvoicePaymentStatusByPaymentRequestInput!) { lnInvoicePaymentStatusByPaymentRequest(input: $input) { paymentRequest status } }',
    { input: { paymentRequest } },
  )
  const result = data.lnInvoicePaymentStatusByPaymentRequest
  if (!result || result.paymentRequest?.toLowerCase() !== paymentRequest.toLowerCase()) {
    throw new Error('Blink did not return a matching invoice status.')
  }
  const status = result.status?.toUpperCase()
  if (status !== 'PAID' && status !== 'PENDING' && status !== 'EXPIRED') {
    throw new Error('Blink returned an unknown invoice status.')
  }
  return status
}
