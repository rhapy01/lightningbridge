import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
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
