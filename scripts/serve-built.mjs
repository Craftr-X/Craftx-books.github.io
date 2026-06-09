import { createReadStream, existsSync, statSync } from 'fs'
import { createServer } from 'http'
import { extname, join, normalize, resolve, sep } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const base = '/Craftx-books.github.io/'
const port = Number(process.env.PORT || 4173)

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function resolveRequest(url) {
  const requestUrl = new URL(url, `http://127.0.0.1:${port}`)
  let pathname = decodeURIComponent(requestUrl.pathname)
  if (pathname === '/') pathname = base
  if (!pathname.startsWith(base)) return ''

  const rel = pathname.slice(base.length)
  const candidates = []
  const direct = join(distDir, rel)
  candidates.push(direct)
  if (!extname(direct)) {
    candidates.push(join(direct, 'index.html'))
    candidates.push(`${direct}.html`)
  }

  for (const candidate of candidates) {
    const full = normalize(candidate)
    if (!full.startsWith(distDir + sep) && full !== distDir) continue
    if (existsSync(full) && statSync(full).isFile()) return full
  }
  return join(distDir, '404.html')
}

createServer((req, res) => {
  const file = resolveRequest(req.url || '/')
  if (!file || !existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }

  res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, '127.0.0.1', () => {
  console.log(`Static preview: http://127.0.0.1:${port}${base}`)
})
