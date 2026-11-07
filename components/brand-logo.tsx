import Image from 'next/image'

export function BrandLogo({ small = false }: { small?: boolean }) {
  return <Image src="/lightningbridge-logo.svg" alt="LightningBridge" width={small ? 190 : 254} height={small ? 36 : 48} priority />
}
