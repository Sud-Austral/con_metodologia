import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.')
const port = Number(process.argv[3] || 8787)

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

const server = http.createServer((req, res) => {
  let filePath = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  if (filePath.endsWith('/')) filePath += 'index.html'
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + filePath); return }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  })
})
server.listen(port, () => console.log(`serving ${root} on http://localhost:${port}`))
