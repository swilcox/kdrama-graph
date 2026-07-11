import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAsianWikiUrl, parseAsianWikiHtml } from './asianwiki.js'

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
    </table><h2><span id="Comments">Comments</span></h2>
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
})
