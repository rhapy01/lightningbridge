# LightningBridge product film

`film.html` is a self-contained, silent 60-second product explainer. It draws the motion graphics and interface illustrations in Canvas and uses the browser's built-in `MediaRecorder` to save a 1600 × 900 WebM; no paid rendering service or video package is needed.

The film explains the actual flow:

1. The payer holds NIM or USDT, while the recipient accepts Bitcoin Lightning.
2. The payer enters a Lightning Address and amount, or pastes a fixed-amount invoice.
3. For a Lightning Address, the app requests a fresh, amount-specific invoice at checkout.
4. Nimiq Pay presents the final asset and fee review; the user chooses NIM or USDT and approves there.
5. Nimiq Pay performs the self-custodial swap. Submitting the swap is not the same as confirmed Lightning settlement.
6. Batch mode can review up to 20 invoices, while Nimiq Pay still requests approval for each payment.

The on-screen phone views are illustrative redraws, not captured Nimiq Pay screens. The film does not show or claim a successful live payment. Settlement caveats are included in the end card.

## Save the video

Open `film.html` through a local web server in a Chromium based browser. Preview it, then use **Render video** and keep the tab open for 60 seconds. The browser downloads `lightningbridge-product-film.webm` when rendering completes. WebM can be uploaded to YouTube or converted to MP4 in CapCut.

## Voiceover script

The film uses on-screen copy and is silent so it can be understood without sound. `narration.txt` contains an optional voiceover script for a later narrated edit.
