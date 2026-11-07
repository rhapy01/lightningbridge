# LightningBridge Mini App

LightningBridge is a Nimiq Pay Mini App for paying Bitcoin over Lightning with NIM or USDT through Nimiq Pay's atomic swap flow. Payers can enter a Lightning Address and amount, or paste a fixed-amount BOLT11 invoice.

The app uses `@nimiq/mini-app-sdk`. In Nimiq Pay, the user first taps **Connect Nimiq Pay wallet**; this requests wallet access and does not make a payment. After invoice review, `payLightningInvoice()` opens a separate native approval where the user chooses the spending asset and reviews the swap. The Mini App never handles private keys.

## Product narrative

LightningBridge is a cross-network payment Mini App: it lets Nimiq Pay users pay a Lightning Address or fixed-amount BOLT11 invoice with NIM or Polygon USDT. For an address, the app requests a fresh amount-specific invoice from its Lightning Address provider at checkout. Nimiq Pay handles the self-custodial swap and native approval; the recipient receives BTC over Lightning without needing to accept NIM or manage the conversion. No Blink account is required.

### Competition description

Pay any compatible Lightning Address from inside Nimiq Pay. Enter the recipient's address and amount; LightningBridge resolves it using LNURL-pay and obtains a fresh fixed-amount invoice. Nimiq Pay previews the amount and fees, asks the user to approve, and performs the self-custodial swap so the recipient gets Bitcoin over Lightning. The payer can also paste a fixed-amount mainnet BOLT11 invoice. This connects Nimiq Pay balances to existing Lightning wallets without requiring the recipient to adopt a new payment account.

## Run locally

```sh
pnpm install
pnpm dev
```

To test wallet features, load the development server URL in Nimiq Pay's Custom URL setting (a phone and development machine on the same Wi-Fi can use the machine's LAN URL). See the [official local testing guide](https://nimiq.dev/mini-apps/development/load-local-mini-app). The app asks for wallet access with an explicit user tap, then enables Lightning payment review only on mainnet. Lightning swaps do not work on testnet. To open the hosted app directly in Nimiq Pay, use `https://nimpay.app/miniapps/open/lightningbridge.vercel.app`.

## Lightning Address resolution

The app resolves `name@provider.com` through the provider's LUD-16 endpoint, checks the requested amount against its LNURL-pay range, requests an invoice for that amount, and verifies the returned BOLT11 amount and expiry before handing it to Nimiq Pay. Resolution is performed by the app server because many address providers do not allow browser-origin requests. Public IPv4 and IPv6 HTTPS hosts are supported; local/private network addresses and redirects are rejected. A recipient needs a Lightning Address provider that supports LNURL-pay; the payer does not need to own a domain or create an account with LightningBridge.

## Current scope

- Accepts Lightning Addresses (LUD-16/LNURL-pay) with an amount, and fixed-amount Bitcoin mainnet BOLT11 invoices (`lnbc…`). QR scanning is not implemented.
- Decodes the invoice and checks its amount and expiry on the server before opening the Nimiq Pay approval flow. Nimiq Pay performs the wallet-side invoice verification; this decoder does not verify BOLT11 signatures.
- A resolved `payLightningInvoice()` call means the wallet transaction was submitted. Settlement confirmation is not available for every Lightning provider; for those payments, the recipient should confirm receipt.
- Lightning Address invoices are created just before review, so the recipient can keep using the same address for future payments. Each payment gets a new amount-specific invoice.

## Nimiq references

- [Mini Apps overview and host APIs](https://nimiq.dev/mini-apps)
- [Build Your First Mini App](https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial)
- [Lightning payments](https://nimiq.dev/mini-apps/features/bitcoin-lightning-payments)
- [API reference](https://nimiq.dev/mini-apps/api-reference)
- [Local Mini App testing](https://nimiq.dev/mini-apps/development/load-local-mini-app)
- [Competition starter kit](https://miniappscompetition.com/starterkit)
- [Competition rules](https://miniappscompetition.com/rules)
- [Competition scoring](https://miniappscompetition.com/scoring)

## Competition publication checklist

Before submission, deploy the app to HTTPS and verify it in Nimiq Pay on mainnet. Competition rules also require a public GitHub repository under the MIT License, a working product, no bundled secrets, and a submission description of up to 250 words. Real usage and community promotion contribute to judging, so those cannot be satisfied by source code alone.
