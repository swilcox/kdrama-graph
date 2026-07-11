import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import {
  closeDatabase, createPerson, createTitle, databaseHealth, deleteCredit, deleteTitle,
  getSnapshot, importAsianWiki, setCredit, updatePerson, updateTitle,
} from './db.js'
import { previewAsianWiki } from './asianwiki.js'

const app = express()
const port = Number(process.env.PORT || 8787)
const appVersion = process.env.APP_VERSION || 'dev'
const appRevision = process.env.APP_REVISION || 'unknown'
app.use(express.json({ limit: '1mb' }))
let shuttingDown = false

const titleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['series', 'movie']),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  status: z.enum(['watchlist', 'watching', 'completed', 'paused', 'dropped']),
  episodesWatched: z.number().int().min(0).optional(),
  episodesTotal: z.number().int().positive().nullable().optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  posterUrl: z.string().max(1000).optional(),
  asianwikiUrl: z.union([z.string().url(), z.literal('')]).optional(),
  notes: z.string().max(10000).optional(),
})
const personSchema = z.object({
  name: z.string().trim().min(1).max(120),
  photoUrl: z.string().max(1000).optional(),
  asianwikiUrl: z.union([z.string().url(), z.literal('')]).optional(),
  notes: z.string().max(5000).optional(),
})

app.get('/api/health', (_req, res) => {
  try {
    if (shuttingDown || !databaseHealth()) return res.status(503).json({ status: 'unhealthy' })
    res.json({ status: 'ok', version: appVersion, revision: appRevision })
  } catch {
    res.status(503).json({ status: 'unhealthy' })
  }
})
app.get('/api/snapshot', (_req, res) => res.json(getSnapshot()))
app.post('/api/titles', route(titleSchema, (body) => ({ id: createTitle(body) })))
app.put('/api/titles/:id', route(titleSchema, (body, req) => {
  updateTitle(Number(req.params.id), body)
  return { ok: true }
}))
app.delete('/api/titles/:id', (req, res) => {
  deleteTitle(Number(req.params.id))
  res.json({ ok: true })
})
app.post('/api/people', route(personSchema, (body) => ({ id: createPerson(body) })))
app.put('/api/people/:id', route(personSchema, (body, req) => {
  updatePerson(Number(req.params.id), body)
  return { ok: true }
}))
app.put('/api/credits', route(z.object({
  titleId: z.number().int().positive(), personId: z.number().int().positive(),
  characterName: z.string().max(120).default(''), role: z.string().max(60).default('Cast'),
}), (body) => {
  setCredit(body.titleId, body.personId, body.characterName, body.role)
  return { ok: true }
}))
app.delete('/api/credits/:id', (req, res) => {
  deleteCredit(Number(req.params.id))
  res.json({ ok: true })
})
app.post('/api/import/asianwiki/preview', route(z.object({ url: z.string().url() }), async (body) => {
  return await previewAsianWiki(body.url)
}))
app.post('/api/import/asianwiki', route(z.object({
  preview: z.object({
    sourceUrl: z.string().url(), name: z.string().min(1), type: z.enum(['series', 'movie']),
    year: z.number().int().nullable(), episodesTotal: z.number().int().positive().nullable(),
    posterUrl: z.string(),
    cast: z.array(z.object({ name: z.string().min(1), asianwikiUrl: z.string().url(), photoUrl: z.string(), characterName: z.string(), role: z.string(), billingOrder: z.number().int().min(0) })),
  }),
  status: z.enum(['watchlist', 'watching', 'completed', 'paused', 'dropped']),
  castLimit: z.number().int().min(1).max(500),
}), (body) => importAsianWiki(body.preview, body.status, body.castLimit)))

const dist = resolve('dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*splat', (_req, res) => res.sendFile(resolve(dist, 'index.html')))
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' })
})

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, () => console.log(`Scene Map listening on http://0.0.0.0:${port}`))
  const shutdown = (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`${signal} received; finishing active requests`)
    const deadline = setTimeout(() => {
      console.error('Graceful shutdown timed out')
      process.exit(1)
    }, 10_000)
    deadline.unref()
    server.close(() => {
      try {
        closeDatabase()
        console.log('SQLite checkpoint complete')
        process.exit(0)
      } catch (error) {
        console.error('Could not close SQLite cleanly', error)
        process.exit(1)
      }
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

function route<T extends z.ZodTypeAny>(schema: T, handler: (body: z.infer<T>, req: express.Request) => unknown) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
      res.json(await handler(parsed.data, req))
    } catch (error) {
      next(error)
    }
  }
}

export { app }
