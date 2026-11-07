import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const server = createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/save') {
      if (!request.headers['content-type']?.startsWith('video/webm')) {
        response.writeHead(415)
        response.end('Only a WebM video can be saved here.')
        return
      }
      const chunks = []
      let length = 0
      for await (const chunk of request) {
        length += chunk.length
        if (length > 100_000_000) {
          response.writeHead(413)
          response.end('Video exceeds the 100 MB limit.')
          return
        }
        chunks.push(chunk)
      }
      await writeFile(join(root, 'lightningbridge-product-film.webm'), Buffer.concat(chunks))
      response.writeHead(201, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Video saved in the promo-video folder.')
      return
    }
    if (request.method === 'GET' && request.url === '/video') {
      const file = join(root, 'lightningbridge-product-film.webm')
      const details = await stat(file)
      response.writeHead(200, { 'content-type': 'video/webm', 'content-length': details.size, 'cache-control': 'no-store' })
      createReadStream(file).pipe(response)
      return
    }
    if (request.method === 'GET' && request.url === '/narration.wav') {
      const file = join(root, 'narration.wav')
      const details = await stat(file)
      response.writeHead(200, { 'content-type': 'audio/wav', 'content-length': details.size, 'cache-control': 'no-store' })
      createReadStream(file).pipe(response)
      return
    }
    if (request.method === 'GET' && request.url === '/music.mp3') {
      const file = join(root, 'technology-music-pixabay.mp3')
      const details = await stat(file)
      response.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': details.size, 'cache-control': 'no-store' })
      createReadStream(file).pipe(response)
      return
    }
    if (request.method === 'GET' && request.url === '/preview') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      response.end('<!doctype html><meta name="viewport" content="width=device-width"><title>LightningBridge film preview</title><body style="margin:0;background:#101b19;display:grid;place-items:center;min-height:100vh"><main style="width:min(100vw,1200px);color:#c8d7cb;font:13px Segoe UI,Arial,sans-serif"><video id="film" controls autoplay playsinline style="width:100%;height:auto" src="/video"></video><p id="details" style="padding:0 14px">Loading video…</p></main><script>const v=document.querySelector("#film"),d=document.querySelector("#details");v.onloadedmetadata=()=>d.textContent=`${v.duration.toFixed(1)} seconds · ${v.videoWidth} × ${v.videoHeight} · ${v.canPlayType("video/webm; codecs=vp9")?"WebM/VP9":"WebM"}`;v.onerror=()=>d.textContent="The browser could not decode this video.";v.ontimeupdate=()=>d.dataset.position=v.currentTime.toFixed(1)</script></body>')
      return
    }
    if (request.method !== 'GET' || !['/', '/film.html'].includes(request.url || '')) {
      response.writeHead(404)
      response.end('Not found.')
      return
    }
    const body = await readFile(join(root, 'film.html'))
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    response.end(body)
  } catch {
    response.writeHead(500)
    response.end('Could not load the product film.')
  }
})

server.listen(3210, '127.0.0.1', () => process.stdout.write('Product film ready at http://127.0.0.1:3210\n'))
