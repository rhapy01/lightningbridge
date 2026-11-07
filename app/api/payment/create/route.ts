import { NextResponse } from 'next/server'
import { createBlinkInvoice } from '@/lib/blink'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    if (rawBody.length > 2_048) {
      return NextResponse.json({ message: 'Request body is too large.' }, { status: 413 })
    }
    const body = JSON.parse(rawBody)
    const amountSats = Number(body?.amountSats)
    const memo = typeof body?.memo === 'string' ? body.memo.trim() : ''
    const username = typeof body?.username === 'string' ? body.username.trim().replace(/^@/, '') : ''

    if (!Number.isSafeInteger(amountSats) || amountSats < 1 || amountSats > 10_000_000) {
      return NextResponse.json({ message: 'Enter an amount from 1 to 10,000,000 sats.' }, { status: 400 })
    }
    if (memo.length > 120) {
      return NextResponse.json({ message: 'Description must be 120 characters or fewer.' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]{2,32}$/.test(username)) {
      return NextResponse.json({ message: 'Enter your Blink username (letters, numbers, or underscores).'}, { status: 400 })
    }

    const invoice = await createBlinkInvoice(username, amountSats, memo)

    return NextResponse.json({
      invoice,
    }, { status: 201 })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not reach Blink.'
    return NextResponse.json({ message }, { status: 502 })
  }
}
