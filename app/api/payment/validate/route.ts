import { decode } from 'light-bolt11-decoder'
import { NextResponse } from 'next/server'

function parseInvoice(value: string) {
  const normalized = value.trim().toLowerCase()

  if (normalized.startsWith('lnurl')) {
    return { valid: false, message: 'LNURL payments are not supported yet. Paste a fixed-amount invoice.' }
  }

  if (!normalized.startsWith('lnbc')) {
    return { valid: false, message: 'Paste a valid Bitcoin mainnet Lightning invoice.' }
  }

  try {
    const decoded = decode(normalized)
    const amountTag = decoded.sections.find((section: { name: string }) => section.name === 'amount') as { value?: string } | undefined
    const amountMillisats = amountTag?.value ? Number(amountTag.value) : 0

    if (!Number.isFinite(amountMillisats) || amountMillisats <= 0) {
      return { valid: false, message: 'Only fixed-amount invoices are supported.' }
    }

    const expiryTag = decoded.sections.find((section: { name: string }) => section.name === 'expiry') as { value?: string } | undefined
    const expirySeconds = Number(expiryTag?.value || 3600)
    const timestampTag = decoded.sections.find((section: { name: string }) => section.name === 'timestamp') as { value?: number | string } | undefined
    const timestamp = Number(timestampTag?.value || 0)
    const expiresAt = timestamp * 1000 + expirySeconds * 1000

    if (expiresAt <= Date.now()) {
      return { valid: false, message: 'This invoice has expired. Ask the merchant for a new one.' }
    }

    return {
      valid: true,
      amountMillisats,
      amountSats: amountMillisats / 1000,
      type: 'bolt11',
      expiresAt,
    }
  } catch {
    return { valid: false, message: 'This invoice could not be decoded. Check that it was copied completely.' }
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    if (rawBody.length > 16_384) {
      return NextResponse.json({ valid: false, message: 'Request body is too large.' }, { status: 413 })
    }
    const body = JSON.parse(rawBody)
    const invoice = typeof body?.invoice === 'string' ? body.invoice : ''

    if (invoice.length > 10_000) {
      return NextResponse.json({ valid: false, message: 'Invoice is too long.' }, { status: 413 })
    }

    const result = parseInvoice(invoice)
    return NextResponse.json(result, { status: result.valid ? 200 : 400 })
  } catch {
    return NextResponse.json({ valid: false, message: 'Invalid request body.' }, { status: 400 })
  }
}
