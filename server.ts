import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import express from 'express'
import multer from 'multer'

type MediaRecord = {
  code: string
  filename: string
  mimetype: string
  size: number
  createdAt: string
}

const app = express()
const port = Number(process.env.PORT || 3001)
const storageDirectory = path.resolve(process.env.STORAGE_DIR || '.')
const dataDirectory = path.join(storageDirectory, 'data')
const uploadDirectory = path.join(storageDirectory, 'uploads')
const recordsFile = path.join(dataDirectory, 'media.json')
const allowedTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const codeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const codePattern = /^(?:[A-Z0-9]{6}|[a-f0-9]{8}|[a-f0-9]{24})$/i
const uploadLimit = 5
const uploadWindowMs = 15 * 60 * 1000
const uploadWindows = new Map<string, { count: number; expiresAt: number }>()

await fs.mkdir(uploadDirectory, { recursive: true })
await fs.mkdir(dataDirectory, { recursive: true })

app.disable('x-powered-by')
if (process.env.RAILWAY_ENVIRONMENT) app.set('trust proxy', 1)
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:")
  if (process.env.NODE_ENV === 'production') response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})

async function readRecords(): Promise<Record<string, MediaRecord>> {
  try {
    const data: unknown = JSON.parse(await fs.readFile(recordsFile, 'utf8'))
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid media index')
    return data as Record<string, MediaRecord>
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return {}
    throw error
  }
}

async function detectMediaType(filePath: string): Promise<string | null> {
  let file: Awaited<ReturnType<typeof fs.open>>
  try {
    file = await fs.open(filePath, 'r')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
  const header = Buffer.alloc(16)
  try {
    const { bytesRead } = await file.read(header, 0, header.length, 0)
    const bytes = header.subarray(0, bytesRead)
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
    if (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif'
    if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
    if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm'
    if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
      return bytes.subarray(8, 12).toString('ascii') === 'qt  ' ? 'video/quicktime' : 'video/mp4'
    }
    return null
  } finally {
    await file.close()
  }
}

function normalizeCode(code: string) {
  return /^[A-Z0-9]{6}$/i.test(code) ? code.toUpperCase() : code
}

function generateMediaCode() {
  return Array.from({ length: 6 }, () => codeAlphabet[crypto.randomInt(codeAlphabet.length)]).join('')
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function limitUploadRate(request: express.Request, response: express.Response, next: express.NextFunction) {
  const now = Date.now()
  const key = request.ip || request.socket.remoteAddress || 'unknown'
  const current = uploadWindows.get(key)
  if (!current || current.expiresAt <= now) {
    uploadWindows.set(key, { count: 1, expiresAt: now + uploadWindowMs })
    next()
    return
  }
  if (current.count >= uploadLimit) {
    response.setHeader('Retry-After', Math.ceil((current.expiresAt - now) / 1000))
    response.status(429).json({ error: 'Batas unggah tercapai. Coba lagi beberapa menit.' })
    return
  }
  current.count += 1
  next()
}

const cleanupRateLimit = setInterval(() => {
  const now = Date.now()
  for (const [key, value] of uploadWindows) {
    if (value.expiresAt <= now) uploadWindows.delete(key)
  }
}, uploadWindowMs)
cleanupRateLimit.unref()

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, _file, callback) => callback(null, `${crypto.randomUUID()}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 400 * 1024 * 1024, files: 1 },
})

let recordWriteQueue = Promise.resolve()

app.post('/api/upload', limitUploadRate, upload.single('file'), async (request, response, next) => {
  if (!request.file) {
    response.status(400).json({ error: 'Pilih file gambar atau video yang didukung.' })
    return
  }

  try {
    const mimetype = await detectMediaType(request.file.path)
    if (!mimetype || !allowedTypes.has(mimetype)) {
      await fs.rm(request.file.path, { force: true })
      response.status(415).json({ error: 'Format file tidak didukung atau file tidak valid.' })
      return
    }

    const records = await readRecords()
    let code = generateMediaCode()
    while (records[code]) code = generateMediaCode()
    const media: MediaRecord = {
      code,
      filename: request.file.filename,
      mimetype,
      size: request.file.size,
      createdAt: new Date().toISOString(),
    }

    recordWriteQueue = recordWriteQueue.then(async () => {
      const latestRecords = await readRecords()
      latestRecords[code] = media
      const temporaryFile = `${recordsFile}.${crypto.randomUUID()}.tmp`
      await fs.writeFile(temporaryFile, JSON.stringify(latestRecords, null, 2), { mode: 0o600 })
      await fs.rename(temporaryFile, recordsFile)
    })
    await recordWriteQueue
    response.status(201).json({ code, url: `/${code}` })
  } catch (error) {
    await fs.rm(request.file.path, { force: true }).catch(() => undefined)
    next(error)
  }
})

app.use(express.static(path.resolve('dist')))
app.get('/preview-banner.png', (_request, response, next) => {
  response.setHeader('Cache-Control', 'public, max-age=86400')
  response.sendFile(path.resolve('src/hjk.png'), (error) => {
    if (error) next(error)
  })
})

app.get('/api/media/:code', async (request, response, next) => {
  try {
    if (!codePattern.test(request.params.code)) {
      response.sendStatus(404)
      return
    }
    const code = normalizeCode(request.params.code)
    const record = (await readRecords())[code]
    if (!record || !/^[a-f0-9-]{36}$/i.test(record.filename)) {
      response.status(404).json({ error: 'Media tidak ditemukan.' })
      return
    }
    const filePath = path.join(uploadDirectory, record.filename)
    const mimetype = await detectMediaType(filePath)
    if (!mimetype || !allowedTypes.has(mimetype)) {
      response.status(404).json({ error: 'Media tidak ditemukan.' })
      return
    }
    response.setHeader('Cache-Control', 'private, max-age=300')
    response.json({ code, mimetype, url: `/_media/${code}` })
  } catch (error) {
    next(error)
  }
})

app.get('/_media/:code', async (request, response, next) => {
  try {
    const record = (await readRecords())[normalizeCode(request.params.code)]
    if (!record || !/^[a-f0-9-]{36}$/i.test(record.filename)) {
      response.sendStatus(404)
      return
    }
    const filePath = path.join(uploadDirectory, record.filename)
    const mimetype = await detectMediaType(filePath)
    if (!mimetype || !allowedTypes.has(mimetype)) {
      response.sendStatus(404)
      return
    }
    response.setHeader('Content-Type', mimetype)
    response.setHeader('Content-Disposition', 'inline')
    response.setHeader('Cache-Control', 'private, max-age=3600')
    response.sendFile(filePath)
  } catch (error) {
    next(error)
  }
})

app.get('/:code', async (request, response, next) => {
  if (!codePattern.test(request.params.code)) {
    next()
    return
  }

  try {
    const record = (await readRecords())[normalizeCode(request.params.code)]
    if (!record || !/^[a-f0-9-]{36}$/i.test(record.filename)) {
      response.status(404).type('text/plain').send('Media tidak ditemukan.')
      return
    }
    const filePath = path.join(uploadDirectory, record.filename)
    const mimetype = await detectMediaType(filePath)
    if (!mimetype || !allowedTypes.has(mimetype)) {
      response.status(404).type('text/plain').send('Media tidak ditemukan.')
      return
    }
    response.setHeader('Cache-Control', 'private, max-age=300')
    const host = request.get('host')
    if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host)) {
      response.status(400).type('text/plain').send('Host tidak valid.')
      return
    }
    const origin = new URL(`${request.protocol}://${host}`).origin
    const mediaUrl = `${origin}/_media/${normalizeCode(request.params.code)}`
    const shareImageUrl = `${origin}/preview-banner.png`
    const pageUrl = `${origin}/${normalizeCode(request.params.code)}`
    const escapedPageUrl = escapeHtml(pageUrl)
    const escapedImageUrl = escapeHtml(shareImageUrl)
    const escapedMediaUrl = escapeHtml(mediaUrl)
    const videoMetadata = mimetype.startsWith('video/')
      ? `<meta property="og:video" content="${escapedMediaUrl}"><meta property="og:video:secure_url" content="${escapedMediaUrl}"><meta property="og:video:type" content="${mimetype}"><meta property="og:video:width" content="1280"><meta property="og:video:height" content="720">`
      : ''
    const imageType = 'image/png'
    const previewMetadata = `<meta name="description" content="Lihat media yang dibagikan melalui KAZE99 ID."><meta property="og:site_name" content="KAZE99 ID"><meta property="og:title" content="Media dibagikan | KAZE99 ID"><meta property="og:description" content="Lihat media yang dibagikan melalui KAZE99 ID."><meta property="og:type" content="${mimetype.startsWith('video/') ? 'video.other' : 'website'}"><meta property="og:url" content="${escapedPageUrl}"><meta property="og:image" content="${escapedImageUrl}"><meta property="og:image:secure_url" content="${escapedImageUrl}"><meta property="og:image:type" content="${imageType}"><meta property="og:image:alt" content="Media dibagikan dari KAZE99 ID"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Media dibagikan | KAZE99 ID"><meta name="twitter:description" content="Lihat media yang dibagikan melalui KAZE99 ID."><meta name="twitter:image" content="${escapedImageUrl}">${videoMetadata}`
    const indexHtml = await fs.readFile(path.resolve('dist/index.html'), 'utf8')
    response.setHeader('Cache-Control', 'public, max-age=300')
    response.type('html').send(indexHtml.replace('</head>', `${previewMetadata}</head>`))
  } catch (error) {
    next(error)
  }
})

app.use((_request, response) => response.status(404).json({ error: 'Tidak ditemukan.' }))

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({ error: 'Ukuran file maksimal 400 MB.' })
    return
  }
  console.error('Request failed:', error)
  response.status(500).json({ error: 'Terjadi kesalahan server.' })
})

app.listen(port, () => console.log(`Dropurl API berjalan di http://localhost:${port}`))