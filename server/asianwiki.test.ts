import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAsianWikiUrl, parseAsianWikiHtml, previewAsianWiki } from './asianwiki.js'

const fixture = `
  <html><body><h1>Test Drama</h1><div id="mw-content-text">
    <div class="thumb tright"><img class="thumbimage" src="/images/poster.jpg"></div>
    <h2><span id="Profile">Profile</span></h2><ul>
      <li><b>Drama:</b> Test Drama</li><li><b>Episodes:</b> 12</li>
      <li><b>Release Date:</b> March 1, 2024 - April 2, 2024</li>
    </ul>
    <h2><span id="Cast">Cast</span></h2><table>
      <tr><td><a href="/Actor_One"><img src="/images/actor.jpg"></a></td></tr>
      <tr><td><a href="/Actor_One">Actor One</a></td></tr>
      <tr><td>Lead Character</td></tr>
    </table>
    <p><b>Additional Cast Members:</b></p><ul>
      <li><a href="/Actor_Two" title="Actor Two">Actor Two</a> - Detective Park</li>
      <li><a href="/Actor_One" title="Actor One">Actor One</a> - duplicate listing</li>
    </ul>
    <h2><span id="Comments">Comments</span></h2>
  </div></body></html>`

test('normalizes supported AsianWiki URLs and rejects other hosts', () => {
  assert.equal(normalizeAsianWikiUrl('https://www.asianwiki.com/Test_Drama'), 'https://asianwiki.com/Test_Drama')
  assert.equal(normalizeAsianWikiUrl('https://asianwiki.com/index.php?title=Test_Drama'), 'https://asianwiki.com/Test_Drama')
  assert.equal(normalizeAsianWikiUrl('https://asianwiki.com/You%27re_Beautiful'), 'https://asianwiki.com/You%27re_Beautiful')
  assert.throws(() => normalizeAsianWikiUrl('https://example.com/Test_Drama'), /Only asianwiki/)
})

test('parses title metadata and cast tables', () => {
  const parsed = parseAsianWikiHtml(fixture, 'https://asianwiki.com/Test_Drama')
  assert.equal(parsed.name, 'Test Drama')
  assert.equal(parsed.year, 2024)
  assert.equal(parsed.episodesTotal, 12)
  assert.equal(parsed.posterUrl, 'https://asianwiki.com/images/poster.jpg')
  assert.deepEqual(parsed.cast[0], {
    name: 'Actor One', asianwikiUrl: 'https://asianwiki.com/Actor_One',
    photoUrl: 'https://asianwiki.com/images/actor.jpg', characterName: 'Lead Character', role: 'Lead', billingOrder: 0,
  })
  assert.deepEqual(parsed.cast[1], {
    name: 'Actor Two', asianwikiUrl: 'https://asianwiki.com/Actor_Two',
    photoUrl: '', characterName: 'Detective Park', role: 'Supporting', billingOrder: 1,
  })
  assert.equal(parsed.cast.length, 2)
})

test('previews saved HTML without requesting AsianWiki', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request') })
  const parsed = await previewAsianWiki('https://www.asianwiki.com/Test_Drama', fixture)
  assert.equal(parsed.sourceUrl, 'https://asianwiki.com/Test_Drama')
  assert.equal(parsed.name, 'Test Drama')
  assert.equal(parsed.cast.length, 2)
  assert.equal(fetchMock.mock.callCount(), 0)
})

test('preserves local image paths from complete browser saves for companion-file matching', async () => {
  const saved = fixture.replace('/images/poster.jpg', './Test_Drama_files/poster.jpg').replace('/images/actor.jpg', './Test_Drama_files/Actor%20One.jpg')
  const preview = await previewAsianWiki('https://asianwiki.com/Test_Drama', saved)
  assert.equal(preview.posterUrl, './Test_Drama_files/poster.jpg')
  assert.equal(preview.cast[0].photoUrl, './Test_Drama_files/Actor%20One.jpg')
})

test('parses absolute actor links in browser-saved HTML', () => {
  const saved = fixture.replaceAll('href="/Actor_', 'href="https://asianwiki.com/Actor_')
  assert.deepEqual(parseAsianWikiHtml(saved, 'https://asianwiki.com/Test_Drama'), parseAsianWikiHtml(fixture, 'https://asianwiki.com/Test_Drama'))
})

test('explains how to recover from HTTP 403', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Forbidden', { status: 403 }))
  await assert.rejects(previewAsianWiki('https://asianwiki.com/Test_Drama'), /HTTP 403.*Preview saved HTML/)
})

test('still fetches and parses automatic previews', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(fixture))
  const parsed = await previewAsianWiki('https://asianwiki.com/Test_Drama')
  assert.equal(parsed.cast.length, 2)
  assert.equal(fetchMock.mock.calls[0].arguments[0], 'https://asianwiki.com/index.php?title=Test_Drama&printable=yes')
})

test('preserves other upstream HTTP errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Not found', { status: 404 }))
  await assert.rejects(previewAsianWiki('https://asianwiki.com/Test_Drama'), /HTTP 404/)
})

test('rejects protection pages returned with HTTP 200 or saved from a browser', async (t) => {
  const blocked = '<html><head><title>Just a moment...</title></head><body><form id="challenge-form"></form></body></html>'
  t.mock.method(globalThis, 'fetch', async () => new Response(blocked))
  await assert.rejects(previewAsianWiki('https://asianwiki.com/Test_Drama'), /protection page/)
  await assert.rejects(previewAsianWiki('https://asianwiki.com/Test_Drama', blocked), /protection page/)
  assert.throws(() => parseAsianWikiHtml('<div id="cf-error-details">Blocked</div>', 'https://asianwiki.com/Test_Drama'), /protection page/)
})

test('validates saved HTML and its source URL before any network request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request') })
  await assert.rejects(previewAsianWiki('https://example.com/Test_Drama', fixture), /Only asianwiki/)
  await assert.rejects(previewAsianWiki('https://asianwiki.com/Test_Drama', ''), /Could not recognize/)
  await assert.rejects(previewAsianWiki('https://asianwiki.com/Test_Drama', '한'.repeat(1024 * 1024)), /smaller than 2 MB/)
  assert.equal(fetchMock.mock.callCount(), 0)
})
