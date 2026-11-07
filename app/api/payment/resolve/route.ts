import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'
import { decode } from 'light-bolt11-decoder'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function publicAddress(address: string) {
  if (!isIP(address)) return false
  try {
    const parsed = ipaddr.parse(address)
    if (parsed.kind() === 'ipv6' && parsed.range() === 'ipv4Mapped') return false
    return parsed.range() === 'unicast'
  } catch {
    return false
  }
}

async function safeHttpsUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || isIP(url.hostname)) throw new Error('Lightning provider must use a public HTTPS address.')
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) throw new Error('Lightning provider address is not public.')
  const records = await lookup(hostname, { all: true, verbatim: true })
  if (!records.length || records.some(({ address }) => !publicAddress(address))) throw new Error('Lightning provider address is not public.')
  return url
}

async function getJson(url: URL) {
  const safeUrl = await safeHttpsUrl(url.toString())
  const response = await fetch(safeUrl, { headers: { accept: 'application/json' }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000) })
  if (!response.ok) throw new Error('Lightning provider could not resolve this address.')
  return response.json()
}

function decodeFixedInvoice(invoice: string, amountMillisats: number) {
  const normalized = invoice.trim().toLowerCase()
  if (!normalized.startsWith('lnbc')) throw new Error('Lightning provider returned a non-mainnet invoice.')
  const decoded = decode(normalized)
  const amount = decoded.sections.find((section: { name: string }) => section.name === 'amount') as { value?: string } | undefined
  if (Number(amount?.value) !== amountMillisats) throw new Error('Lightning provider returned an invoice for a different amount.')
  const timestamp = Number((decoded.sections.find((section: { name: string }) => section.name === 'timestamp') as { value?: number | string } | undefined)?.value || 0)
  const expiry = Number((decoded.sections.find((section: { name: string }) => section.name === 'expiry') as { value?: string } | undefined)?.value || 3600)
  const expiresAt = timestamp * 1000 + expiry * 1000
  if (expiresAt <= Date.now()) throw new Error('Lightning provider returned an expired invoice. Try again.')
  return { invoice: normalized, expiresAt }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const address = typeof body?.address === 'string' ? body.address.trim() : ''
    const amountSats = Number(body?.amountSats)
    if (address.length > 320 || !/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address)) return NextResponse.json({ message: 'Enter a Lightning Address in name@provider.com format.' }, { status: 400 })
    if (!Number.isSafeInteger(amountSats) || amountSats < 1 || amountSats > 10_000_000) return NextResponse.json({ message: 'Enter an amount from 1 to 10,000,000 sats.' }, { status: 400 })

    const [username, domain] = address.split('@')
    const endpoint = new URL(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`)
    const details = await getJson(endpoint)
    if (details?.status === 'ERROR' || details?.tag !== 'payRequest' || typeof details.callback !== 'string') throw new Error(details?.reason || 'This address does not support Lightning payments.')
    const amountMillisats = amountSats * 1000
    if (!Number.isSafeInteger(details.minSendable) || !Number.isSafeInteger(details.maxSendable) || amountMillisats < details.minSendable || amountMillisats > details.maxSendable) throw new Error(`This address accepts ${Math.ceil(details.minSendable / 1000)}–${Math.floor(details.maxSendable / 1000)} sats.`)

    const callback = await safeHttpsUrl(details.callback)
    callback.searchParams.set('amount', String(amountMillisats))
    const invoiceResponse = await getJson(callback)
    if (invoiceResponse?.status === 'ERROR' || typeof invoiceResponse?.pr !== 'string') throw new Error(invoiceResponse?.reason || 'Could not get an invoice from this address.')
    const checked = decodeFixedInvoice(invoiceResponse.pr, amountMillisats)
    const metadata = typeof details.metadata === 'string' ? details.metadata.slice(0, 4096) : ''
    const description = typeof invoiceResponse?.routes === 'string' ? 'Lightning Address payment' : 'Fresh invoice from Lightning Address'
    return NextResponse.json({ valid: true, ...checked, amountSats, description, metadata })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not resolve this Lightning Address.'
    return NextResponse.json({ valid: false, message }, { status: 400 })
  }
}
