import { DatabaseSync, backup } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const sourcePath = process.env.DB_PATH || resolve('data/scene-map.db')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
const destination = resolve(process.argv[2] || `backups/scene-map_${timestamp}.db`)

mkdirSync(dirname(destination), { recursive: true })
const source = new DatabaseSync(sourcePath, { readOnly: true })
try {
  const pages = await backup(source, destination, { rate: 100 })
  console.log(`Backup complete: ${destination} (${pages} pages)`)
} finally {
  source.close()
}
