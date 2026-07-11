import { DatabaseSync } from 'node:sqlite'
import { copyFileSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

const sourceArg = process.argv[2]
if (!sourceArg || !process.argv.includes('--force')) {
  console.error('Usage: node scripts/restore.mjs <backup.db> --force')
  process.exit(2)
}

const source = resolve(sourceArg)
const destination = resolve(process.env.DB_PATH || 'data/scene-map.db')
if (!existsSync(source)) throw new Error(`Backup does not exist: ${source}`)
if (source === destination) throw new Error('Backup and destination must be different files')

const candidate = new DatabaseSync(source, { readOnly: true })
try {
  const check = candidate.prepare('PRAGMA quick_check').get()
  if (!check || Object.values(check)[0] !== 'ok') throw new Error('Backup failed SQLite integrity check')
} finally {
  candidate.close()
}

mkdirSync(dirname(destination), { recursive: true })
if (existsSync(destination)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  const safetyDir = resolve(dirname(destination), `pre-restore_${timestamp}`)
  mkdirSync(safetyDir)
  for (const suffix of ['', '-wal', '-shm']) {
    const current = `${destination}${suffix}`
    if (existsSync(current)) renameSync(current, resolve(safetyDir, `${basename(destination)}${suffix}`))
  }
  console.log(`Previous database preserved in ${safetyDir}`)
}
copyFileSync(source, destination)
console.log(`Restore complete: ${destination}`)
