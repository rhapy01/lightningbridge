import { NextResponse } from 'next/server'
export function GET() {
  return NextResponse.json({
    service: 'lightningbridge',
    status: 'ok',
    lightningInvoiceService: 'Blink public API',
  })
}
