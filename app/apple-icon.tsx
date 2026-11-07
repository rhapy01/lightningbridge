import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export default function AppleIcon() {
  return new ImageResponse(<div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 46, background: 'linear-gradient(145deg,#0d8062,#07543f)' }}><svg width="116" height="116" viewBox="0 0 48 48" fill="none"><path d="M5 30h7c4 0 5-13 11-13s7 13 11 13h9" stroke="#eaf8ec" strokeWidth="3.3" strokeLinecap="round"/><circle cx="5" cy="30" r="2.5" fill="#c9f177"/><circle cx="43" cy="30" r="2.5" fill="#f4b15c"/><path d="m25 5-8 17h6l-1 12 10-19h-7l1-10Z" fill="#f8bd66"/></svg></div>, size)
}
