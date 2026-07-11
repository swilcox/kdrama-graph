import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DB_PATH = ':memory:'
const database = await import('./db.js')

test('seeds a connected starter library', () => {
  const snapshot = database.getSnapshot()
  assert.equal(snapshot.titles.length, 4)
  assert.equal(snapshot.people.length, 6)
  assert.equal(snapshot.credits.length, 7)
  assert.equal(snapshot.people.find((person) => person.name === 'Lee Sun-Kyun')?.titleCount, 2)
})

test('creates, updates, and deletes a title', () => {
  const id = database.createTitle({
    name: 'Test Drama', type: 'series', year: 2026, status: 'watchlist',
    episodesWatched: 0, episodesTotal: 12, rating: null,
  })
  database.updateTitle(id, {
    name: 'Test Drama', type: 'series', year: 2026, status: 'watching',
    episodesWatched: 3, episodesTotal: 12, rating: 8,
  })
  const created = database.getSnapshot().titles.find((title) => title.id === id)
  assert.equal(created?.status, 'watching')
  assert.equal(created?.episodesWatched, 3)
  database.deleteTitle(id)
  assert.equal(database.getSnapshot().titles.some((title) => title.id === id), false)
})

test('connects people to titles without duplicating an edge', () => {
  const snapshot = database.getSnapshot()
  const titleId = snapshot.titles[0].id
  const personId = snapshot.people[0].id
  database.setCredit(titleId, personId, 'First character', 'Supporting', 5)
  database.setCredit(titleId, personId, 'Updated character', 'Lead', 0)
  const matching = database.getSnapshot().credits.filter((credit) => credit.titleId === titleId && credit.personId === personId)
  assert.equal(matching.length, 1)
  assert.equal(matching[0].characterName, 'Updated character')
})

test('imports AsianWiki data and merges a repeated import', () => {
  const preview = {
    sourceUrl: 'https://asianwiki.com/Imported_Drama', name: 'Imported Drama',
    type: 'series' as const, year: 2025, episodesTotal: 8,
    posterUrl: 'https://asianwiki.com/images/poster.jpg',
    cast: [{
      name: 'Imported Actor', asianwikiUrl: 'https://asianwiki.com/Imported_Actor',
      photoUrl: 'https://asianwiki.com/images/actor.jpg', characterName: 'Detective Kim', role: 'Lead', billingOrder: 0,
    }],
  }
  const first = database.importAsianWiki(preview, 'watchlist', 1)
  const second = database.importAsianWiki(preview, 'completed', 1)
  assert.equal(first.created, true)
  assert.equal(first.peopleCreated, 1)
  assert.equal(second.created, false)
  assert.equal(second.peopleCreated, 0)
  assert.equal(second.creditsCreated, 0)
})

test('orders a full cast by role priority and source billing', () => {
  const titleId = database.createTitle({ name: 'Billing Test', type: 'series', status: 'watchlist' })
  const supportingId = database.createPerson({ name: 'Aaron Supporting' })
  const secondLeadId = database.createPerson({ name: 'Zelda Second Lead' })
  const firstLeadId = database.createPerson({ name: 'Zelda First Lead' })
  database.setCredit(titleId, supportingId, '', 'Supporting', 0)
  database.setCredit(titleId, secondLeadId, '', 'Lead', 1)
  database.setCredit(titleId, firstLeadId, '', 'Lead', 0)
  const ordered = database.getSnapshot().credits.filter((credit) => credit.titleId === titleId)
  assert.deepEqual(ordered.map((credit) => credit.personName), [
    'Zelda First Lead', 'Zelda Second Lead', 'Aaron Supporting',
  ])
})
