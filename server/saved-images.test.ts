import assert from 'node:assert/strict'
import test from 'node:test'
import { findSavedImage, resolveSavedImages } from '../src/saved-images.js'
import { imageContentType } from './images.js'

const actor = { name: 'Actor One.jpg', webkitRelativePath: 'Drama_files/Actor One.jpg' }

test('matches downloaded images with escaped, relative, absolute, and file paths', () => {
  for (const source of ['./Drama_files/Actor%20One.jpg', 'https://asianwiki.com/Drama_files/Actor%20One.jpg', 'file:///Users/test/Drama_files/Actor%20One.jpg', './Drama_files/Actor%20One.jpg?version=1']) {
    assert.equal(findSavedImage(source, [actor]), actor)
  }
  assert.equal(findSavedImage('/images/thumb/Actor%20One.jpg', [actor]), actor)
  assert.equal(findSavedImage('./Drama_files/missing.jpg', [actor]), undefined)
})

test('uses folder paths to disambiguate equal filenames and never guesses an ambiguous match', () => {
  const other = { ...actor, webkitRelativePath: 'Other_files/Actor One.jpg' }
  assert.equal(findSavedImage('./Drama_files/Actor%20One.jpg', [actor, other]), actor)
  assert.equal(findSavedImage('Actor%20One.jpg', [actor, other]), undefined)
})

test('substitutes selected files, reports missing local images, and preserves remote links', () => {
  const preview = {
    name: 'Drama', type: 'series' as const, sourceUrl: 'https://asianwiki.com/Drama', year: 2026, episodesTotal: 16,
    posterUrl: './Drama_files/missing.jpg',
    cast: [
      { name: 'Actor One', asianwikiUrl: 'https://asianwiki.com/Actor_One', photoUrl: './Drama_files/Actor%20One.jpg', characterName: '', role: 'Lead', billingOrder: 0 },
      { name: 'Actor Two', asianwikiUrl: 'https://asianwiki.com/Actor_Two', photoUrl: 'https://asianwiki.com/images/other.jpg', characterName: '', role: 'Lead', billingOrder: 1 },
    ],
  }
  const result = resolveSavedImages(preview, [actor], () => 'blob:local-preview')
  assert.equal(result.missing, 1)
  assert.equal(result.preview.posterUrl, '')
  assert.equal(result.preview.cast[0].photoUrl, 'blob:local-preview')
  assert.equal(result.preview.cast[1].photoUrl, preview.cast[1].photoUrl)
  assert.equal(preview.cast[0].photoUrl, './Drama_files/Actor%20One.jpg')
})

test('identifies supported image bytes and rejects scripts, SVG, and empty uploads', () => {
  assert.equal(imageContentType(Buffer.from('89504e470d0a1a0a00000000', 'hex')), 'image/png')
  assert.equal(imageContentType(Buffer.from('ffd8ffe00000000000000000', 'hex')), 'image/jpeg')
  assert.equal(imageContentType(Buffer.from('GIF89a000000')), 'image/gif')
  assert.equal(imageContentType(Buffer.from('RIFF0000WEBP')), 'image/webp')
  assert.equal(imageContentType(Buffer.from('<svg onload="alert(1)"></svg>')), null)
  assert.equal(imageContentType(Buffer.from('<script>alert(1)</script>')), null)
  assert.equal(imageContentType(Buffer.alloc(0)), null)
})
