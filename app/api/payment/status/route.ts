import { NextResponse } from 'next/server'
import { getBlinkInvoiceStatus } from '@/lib/blink'

export async function GET(request: Request) {
  const paymentRequest = new URL(request.url).searchParams.get('invoice') || ''
  if (!/^lnbc[0-9a-z]{20,}$/i.test(paymentRequest) || paymentRequest.length > 5_000) {
    return NextResponse.json({ message: 'Invalid payment request.' }, { status: 400 })
  }

  try {
    const status = await getBlinkInvoiceStatus(paymentRequest)
    const state = status === 'PAID' ? 'paid'
      : status === 'EXPIRED' ? 'failed' : 'pending'
    return NextResponse.json({ state, paid: state === 'paid' })
  } catch {
    return NextResponse.json({ message: 'Blink could not check this invoice right now.' }, { status: 502 })
  }
}
