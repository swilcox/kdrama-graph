import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export type TitleInput = {
  name: string
  type: 'series' | 'movie'
  year?: number | null
  status: 'watchlist' | 'watching' | 'completed' | 'paused' | 'dropped'
  episodesWatched?: number
  episodesTotal?: number | null
  rating?: number | null
  posterUrl?: string
  asianwikiUrl?: string
  notes?: string
}

export type PersonInput = {
  name: string
  photoUrl?: string
  asianwikiUrl?: string
  notes?: string
}

const dbPath = process.env.DB_PATH || resolve('data/scene-map.db')
mkdirSync(dirname(dbPath), { recursive: true })
export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

db.exec(`
  CREATE TABLE IF NOT EXISTS titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('series', 'movie')),
    year INTEGER,
    status TEXT NOT NULL CHECK(status IN ('watchlist', 'watching', 'completed', 'paused', 'dropped')),
    episodes_watched INTEGER NOT NULL DEFAULT 0,
    episodes_total INTEGER,
    rating REAL,
    poster_url TEXT NOT NULL DEFAULT '',
    asianwiki_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    photo_url TEXT NOT NULL DEFAULT '',
    asianwiki_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    character_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Cast',
    billing_order INTEGER NOT NULL DEFAULT 9999,
    UNIQUE(title_id, person_id)
  );
`)

const creditColumns = db.prepare('PRAGMA table_info(credits)').all() as Array<{ name: string }>
if (!creditColumns.some((column) => column.name === 'billing_order')) {
  db.exec('ALTER TABLE credits ADD COLUMN billing_order INTEGER NOT NULL DEFAULT 9999')
  // Credit ids reflect insertion order for libraries created before billing order was stored.
  db.exec('UPDATE credits SET billing_order = id')
}

const titleCount = db.prepare('SELECT COUNT(*) AS count FROM titles').get() as { count: number }
if (titleCount.count === 0) seed()

function seed() {
  const addTitle = db.prepare(`
    INSERT INTO titles (name, type, year, status, episodes_watched, episodes_total, rating, poster_url, asianwiki_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const addPerson = db.prepare('INSERT INTO people (name, photo_url, asianwiki_url) VALUES (?, ?, ?)')
  const addCredit = db.prepare('INSERT INTO credits (title_id, person_id, character_name, role, billing_order) VALUES (?, ?, ?, ?, ?)')

  db.exec('BEGIN')
  try {
    const crash = Number(addTitle.run('Crash Landing on You', 'series', 2019, 'completed', 16, 16, 9,
      'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=600&q=85',
      'https://asianwiki.com/Crash_Landing_on_You', 'Warm, funny, and unusually strong supporting characters.').lastInsertRowid)
    const parasite = Number(addTitle.run('Parasite', 'movie', 2019, 'completed', 0, null, 9.5,
      'https://images.unsplash.com/photo-1534274867514-d5b47ef89ed7?auto=format&fit=crop&w=600&q=85',
      'https://asianwiki.com/Parasite_(Korean_Movie)', 'A razor-sharp rewatch. The production design does half the storytelling.').lastInsertRowid)
    const myMister = Number(addTitle.run('My Mister', 'series', 2018, 'watching', 7, 16, 8.5,
      'https://images.unsplash.com/photo-1535189043414-47a3c49a0bed?auto=format&fit=crop&w=600&q=85',
      'https://asianwiki.com/My_Mister', 'Quiet and heavy. Best watched one episode at a time.').lastInsertRowid)
    const queen = Number(addTitle.run('Queen of Tears', 'series', 2024, 'watchlist', 0, 16, null,
      'https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=600&q=85',
      'https://asianwiki.com/Queen_Of_Tears', '').lastInsertRowid)

    const hyunBin = Number(addPerson.run('Hyun Bin', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=85', 'https://asianwiki.com/Hyun-Bin').lastInsertRowid)
    const sonYeJin = Number(addPerson.run('Son Ye-Jin', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=85', 'https://asianwiki.com/Son_Ye-Jin').lastInsertRowid)
    const songKangHo = Number(addPerson.run('Song Kang-Ho', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=85', 'https://asianwiki.com/Song_Kang-Ho').lastInsertRowid)
    const leeSunKyun = Number(addPerson.run('Lee Sun-Kyun', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=85', 'https://asianwiki.com/Lee_Sun-Kyun').lastInsertRowid)
    const iu = Number(addPerson.run('IU', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=85', 'https://asianwiki.com/IU').lastInsertRowid)
    const kimSooHyun = Number(addPerson.run('Kim Soo-Hyun', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=300&q=85', 'https://asianwiki.com/Kim_Soo-Hyun').lastInsertRowid)

    addCredit.run(crash, hyunBin, 'Ri Jeong-Hyeok', 'Lead', 0)
    addCredit.run(crash, sonYeJin, 'Yoon Se-Ri', 'Lead', 1)
    addCredit.run(parasite, songKangHo, 'Kim Ki-Taek', 'Lead', 0)
    addCredit.run(parasite, leeSunKyun, 'Park Dong-Ik', 'Supporting', 1)
    addCredit.run(myMister, leeSunKyun, 'Park Dong-Hoon', 'Lead', 0)
    addCredit.run(myMister, iu, 'Lee Ji-An', 'Lead', 1)
    addCredit.run(queen, kimSooHyun, 'Baek Hyun-Woo', 'Lead', 0)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const titleSelect = `
  SELECT t.*, COUNT(c.id) AS cast_count
  FROM titles t LEFT JOIN credits c ON c.title_id = t.id
  GROUP BY t.id ORDER BY t.updated_at DESC, t.name
`

export function getSnapshot() {
  const titles = db.prepare(titleSelect).all().map(mapTitle)
  const people = db.prepare(`
    SELECT p.*, COUNT(c.id) AS title_count
    FROM people p LEFT JOIN credits c ON c.person_id = p.id
    GROUP BY p.id ORDER BY p.name
  `).all().map(mapPerson)
  const credits = db.prepare(`
    SELECT c.id, c.title_id, c.person_id, c.character_name, c.role, c.billing_order,
           t.name AS title_name, p.name AS person_name
    FROM credits c JOIN titles t ON t.id = c.title_id JOIN people p ON p.id = c.person_id
    ORDER BY c.title_id,
      CASE c.role WHEN 'Lead' THEN 0 WHEN 'Supporting' THEN 1 WHEN 'Cast' THEN 2 WHEN 'Cameo' THEN 3 ELSE 4 END,
      c.billing_order, p.name
  `).all().map((row: any) => ({
    id: row.id, titleId: row.title_id, personId: row.person_id,
    characterName: row.character_name, role: row.role, billingOrder: row.billing_order,
    titleName: row.title_name, personName: row.person_name,
  }))
  return { titles, people, credits }
}

export function createTitle(input: TitleInput) {
  const result = db.prepare(`
    INSERT INTO titles (name, type, year, status, episodes_watched, episodes_total, rating, poster_url, asianwiki_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.name, input.type, input.year ?? null, input.status, input.episodesWatched ?? 0,
    input.episodesTotal ?? null, input.rating ?? null, input.posterUrl ?? '', input.asianwikiUrl ?? '', input.notes ?? '')
  return Number(result.lastInsertRowid)
}

export function updateTitle(id: number, input: TitleInput) {
  db.prepare(`
    UPDATE titles SET name=?, type=?, year=?, status=?, episodes_watched=?, episodes_total=?, rating=?,
      poster_url=?, asianwiki_url=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(input.name, input.type, input.year ?? null, input.status, input.episodesWatched ?? 0,
    input.episodesTotal ?? null, input.rating ?? null, input.posterUrl ?? '', input.asianwikiUrl ?? '', input.notes ?? '', id)
}

export function deleteTitle(id: number) {
  db.prepare('DELETE FROM titles WHERE id = ?').run(id)
}

export function createPerson(input: PersonInput) {
  const result = db.prepare('INSERT INTO people (name, photo_url, asianwiki_url, notes) VALUES (?, ?, ?, ?)')
    .run(input.name, input.photoUrl ?? '', input.asianwikiUrl ?? '', input.notes ?? '')
  return Number(result.lastInsertRowid)
}

export function updatePerson(id: number, input: PersonInput) {
  db.prepare('UPDATE people SET name=?, photo_url=?, asianwiki_url=?, notes=? WHERE id=?')
    .run(input.name, input.photoUrl ?? '', input.asianwikiUrl ?? '', input.notes ?? '', id)
}

export function setCredit(titleId: number, personId: number, characterName: string, role: string, billingOrder = 9999) {
  db.prepare(`
    INSERT INTO credits (title_id, person_id, character_name, role, billing_order) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(title_id, person_id) DO UPDATE SET character_name=excluded.character_name,
      role=excluded.role, billing_order=excluded.billing_order
  `).run(titleId, personId, characterName, role, billingOrder)
}

export function deleteCredit(id: number) {
  db.prepare('DELETE FROM credits WHERE id = ?').run(id)
}

export function databaseHealth() {
  const result = db.prepare('SELECT 1 AS ok').get() as { ok: number }
  return result.ok === 1
}

export function closeDatabase() {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  db.close()
}

export function importAsianWiki(preview: {
  sourceUrl: string
  name: string
  type: 'series' | 'movie'
  year: number | null
  episodesTotal: number | null
  posterUrl: string
  cast: Array<{ name: string; asianwikiUrl: string; photoUrl: string; characterName: string; role: string; billingOrder: number }>
}, status: TitleInput['status'], castLimit: number) {
  db.exec('BEGIN')
  try {
    const existingTitle = db.prepare(`
      SELECT id FROM titles WHERE asianwiki_url = ? OR (lower(name) = lower(?) AND year IS ?)
      ORDER BY asianwiki_url = ? DESC LIMIT 1
    `).get(preview.sourceUrl, preview.name, preview.year, preview.sourceUrl) as { id: number } | undefined
    let titleId = existingTitle?.id
    if (titleId) {
      db.prepare(`UPDATE titles SET name=?, type=?, year=?, episodes_total=?, poster_url=?, asianwiki_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .run(preview.name, preview.type, preview.year, preview.episodesTotal, preview.posterUrl, preview.sourceUrl, titleId)
    } else {
      titleId = createTitle({
        name: preview.name, type: preview.type, year: preview.year, status,
        episodesWatched: 0, episodesTotal: preview.episodesTotal,
        posterUrl: preview.posterUrl, asianwikiUrl: preview.sourceUrl,
      })
    }

    let peopleCreated = 0
    let creditsCreated = 0
    for (const castMember of preview.cast.slice(0, castLimit)) {
      const existingPerson = db.prepare(`
        SELECT id FROM people WHERE asianwiki_url = ? OR lower(name) = lower(?)
        ORDER BY asianwiki_url = ? DESC LIMIT 1
      `).get(castMember.asianwikiUrl, castMember.name, castMember.asianwikiUrl) as { id: number } | undefined
      let personId = existingPerson?.id
      if (!personId) {
        personId = createPerson(castMember)
        peopleCreated++
      } else {
        db.prepare(`UPDATE people SET photo_url=CASE WHEN ? != '' THEN ? ELSE photo_url END,
          asianwiki_url=CASE WHEN ? != '' THEN ? ELSE asianwiki_url END WHERE id=?`)
          .run(castMember.photoUrl, castMember.photoUrl, castMember.asianwikiUrl, castMember.asianwikiUrl, personId)
      }
      const prior = db.prepare('SELECT id FROM credits WHERE title_id=? AND person_id=?').get(titleId, personId)
      setCredit(titleId, personId, castMember.characterName, castMember.role, castMember.billingOrder)
      if (!prior) creditsCreated++
    }
    db.exec('COMMIT')
    return { titleId, created: !existingTitle, peopleCreated, creditsCreated }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function mapTitle(row: any) {
  return {
    id: row.id, name: row.name, type: row.type, year: row.year, status: row.status,
    episodesWatched: row.episodes_watched, episodesTotal: row.episodes_total, rating: row.rating,
    posterUrl: row.poster_url, asianwikiUrl: row.asianwiki_url, notes: row.notes,
    castCount: row.cast_count, updatedAt: row.updated_at,
  }
}

function mapPerson(row: any) {
  return {
    id: row.id, name: row.name, photoUrl: row.photo_url, asianwikiUrl: row.asianwiki_url,
    notes: row.notes, titleCount: row.title_count,
  }
}
