import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import type { AsianWikiPreview } from './asianwiki.js'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { app } = await import('./index.js')

test('saved-page previews accept HTML over 1 MB and feed the existing import flow', async () => {
  const server = app.listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}`
    const post = (path: string, body: unknown) => fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const before = await (await fetch(`${base}/api/snapshot`)).json()
    const response = await post('/api/import/asianwiki/preview', {
      url: 'https://asianwiki.com/Saved_Drama',
      html: `<html><body><h1>Saved Drama</h1><div id="mw-content-text">
        <h2><span id="Profile">Profile</span></h2><ul>
          <li><b>Drama:</b> Saved Drama</li><li><b>Episodes:</b> 16</li>
        </ul><h2><span id="Cast">Cast</span></h2><table>
          <tr><td><a href="https://asianwiki.com/Saved_Actor"><img src="https://asianwiki.com/images/actor.jpg"></a></td></tr>
          <tr><td><a href="https://asianwiki.com/Saved_Actor">Saved Actor</a></td></tr>
          <tr><td>Detective</td></tr>
        </table></div><!--${' '.repeat(1024 * 1024)}--></body></html>`,
    })
    assert.equal(response.status, 200)
    const preview = await response.json() as AsianWikiPreview
    assert.equal(preview.name, 'Saved Drama')
    assert.equal(preview.cast[0].characterName, 'Detective')
    assert.deepEqual(await (await fetch(`${base}/api/snapshot`)).json(), before)

    const imported = await post('/api/import/asianwiki', { preview, status: 'watchlist', castLimit: 1 })
    assert.equal(imported.status, 200)
    const result = await imported.json() as { peopleCreated: number }
    assert.equal(result.peopleCreated, 1)

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
    const upload = () => fetch(`${base}/api/images`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: png })
    const imageResponse = await upload()
    assert.equal(imageResponse.status, 200)
    const image = await imageResponse.json() as { url: string }
    assert.match(image.url, /^\/api\/images\/[a-f0-9]{64}$/)
    assert.deepEqual(await (await upload()).json(), image)
    const imagePreview = { ...preview, posterUrl: image.url, cast: preview.cast.map((person) => ({ ...person, photoUrl: image.url })) }
    const repaired = await post('/api/import/asianwiki', { preview: imagePreview, status: 'completed', castLimit: 1 })
    assert.equal(repaired.status, 200)
    assert.equal((await repaired.json() as { created: boolean }).created, false)
    const { getSnapshot, getImage } = await import('./db.js')
    const title = getSnapshot().titles.find((item) => item.name === 'Saved Drama')
    assert.equal(title?.posterUrl, image.url)
    assert.equal(title?.status, 'watchlist')
    assert.equal(getSnapshot().people.find((person) => person.name === 'Saved Actor')?.photoUrl, image.url)
    assert.deepEqual(Buffer.from(getImage(image.url.split('/').at(-1)!)!.data), png)
    const served = await fetch(`${base}${image.url}`)
    assert.equal(served.headers.get('content-type'), 'image/png')
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff')
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), png)
    assert.equal((await fetch(`${base}/api/images/${'0'.repeat(64)}`)).status, 404)
    const script = await fetch(`${base}/api/images`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: '<script>alert(1)</script>' })
    assert.equal(script.status, 400)
    const largeImage = await fetch(`${base}/api/images`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(5 * 1024 * 1024 + 1) })
    assert.equal(largeImage.status, 413)

    const invalid = await post('/api/import/asianwiki/preview', { url: 'https://asianwiki.com/Saved_Drama', html: 42 })
    assert.equal(invalid.status, 400)
    const oversized = await post('/api/import/asianwiki/preview', { url: 'https://asianwiki.com/Saved_Drama', html: 'x'.repeat(2 * 1024 * 1024 + 1) })
    assert.equal(oversized.status, 400)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
