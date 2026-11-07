# LightningBridge product film

`film.html` is a 60-second product explainer with synchronized narration and a licensed electronic background track. It draws the motion graphics in Canvas and uses the browser's built-in `MediaRecorder` to save a 1600 × 900 WebM; no paid rendering service is needed.

The film explains the actual flow:

1. The payer holds NIM or USDT, while the recipient accepts Bitcoin Lightning.
2. The payer enters a Lightning Address and amount, or pastes a fixed-amount invoice.
3. For a Lightning Address, the app requests a fresh, amount-specific invoice at checkout.
4. Nimiq Pay presents the final asset and fee review; the user chooses NIM or USDT and approves there.
5. Nimiq Pay performs the self-custodial swap. Submitting the swap is not the same as confirmed Lightning settlement.
6. Batch mode can review up to 20 invoices, while Nimiq Pay still requests approval for each payment.

The on-screen phone views are illustrative redraws, not captured Nimiq Pay screens. The film does not show or claim a successful live payment. Settlement caveats are included in the end card.

## Save the video

Run `node promo-video/server.mjs`, open `http://127.0.0.1:3210/` in Chrome or Edge, and select **Render video**. Keep the page open for about 60 seconds. It mixes `narration.wav` with `technology-music-pixabay.mp3` and saves `lightningbridge-product-film.webm` in this folder. `render-narration.ps1` regenerates the narration locally from `narration.txt` with Windows speech synthesis. Open `/preview` on the local server to inspect the saved video.

## Voiceover script

`narration.txt` contains the spoken script, timed to the eight film scenes. The licensed music is faded in and out and mixed below a compressed voice track. Track and license details are in `music-attribution.txt`.

## Music license

The score is “Technology Music (Free Music)” by MiroMaxMusic, downloaded from [Pixabay](https://pixabay.com/music/corporate-technology-music-free-music-487038/) under the Pixabay Content License. That license allows free use and adaptation without attribution; credit and license details are recorded in `music-attribution.txt`. The standalone MP3 is kept out of this repository; download it from the source page to render a fresh copy.

## Social upload copy

`lightningbridge-product-film.mp4` is the ready-to-upload export for platforms that require MP4: H.264 video at 1280 × 720 and AAC audio. The browser-rendered WebM master is kept alongside it.
