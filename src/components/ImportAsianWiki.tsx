import { useEffect, useState } from 'react'
import { Check, Download, ExternalLink, LoaderCircle, X } from 'lucide-react'
import { api } from '../api'
import type { AsianWikiPreview, WatchStatus } from '../types'
import { Artwork } from './Artwork'
import { resolveSavedImages } from '../saved-images'

export function ImportAsianWiki({ onClose, onImported }: { onClose: () => void; onImported: (titleId: number) => Promise<void> }) {
  const [url, setUrl] = useState('')
  const [savedFile, setSavedFile] = useState<File | null>(null)
  const [savedImages, setSavedImages] = useState<File[]>([])
  const [localImages, setLocalImages] = useState(new Map<string, File>())
  const [missingImages, setMissingImages] = useState(0)
  const [preview, setPreview] = useState<AsianWikiPreview | null>(null)
  const [status, setStatus] = useState<WatchStatus>('watchlist')
  const [castLimit, setCastLimit] = useState(500)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ created: boolean; peopleCreated: number; creditsCreated: number } | null>(null)
  useEffect(() => () => { for (const url of localImages.keys()) URL.revokeObjectURL(url) }, [localImages])

  const loadPreview = async (file?: File) => {
    setBusy(true); setError(''); setResult(null); setPreview(null); setMissingImages(0)
    const images = new Map<string, File>()
    try {
      if (file && file.size > 2 * 1024 * 1024) throw new Error('Choose an HTML file smaller than 2 MB')
      const data = await api.previewAsianWiki(url, file ? await file.text() : undefined)
      const resolved = resolveSavedImages(data, file ? savedImages : [], (image) => {
        for (const [url, existing] of images) if (existing === image) return url
        const url = URL.createObjectURL(image)
        images.set(url, image)
        return url
      })
      setPreview(resolved.preview)
      setMissingImages(resolved.missing)
      setCastLimit(data.cast.length)
    } catch (err) { setError(message(err)) }
    finally { setLocalImages(images); setBusy(false) }
  }
  const runImport = async () => {
    if (!preview) return
    setBusy(true); setError('')
    try {
      const uploaded = new Map<string, string>()
      const sources = [preview.posterUrl, ...preview.cast.slice(0, castLimit).map((person) => person.photoUrl)]
      for (const source of new Set(sources)) {
        const file = localImages.get(source)
        if (!file) continue
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than the 5 MB image limit`)
        uploaded.set(source, (await api.uploadImage(file)).url)
      }
      const importedPreview = {
        ...preview, posterUrl: uploaded.get(preview.posterUrl) ?? preview.posterUrl,
        cast: preview.cast.slice(0, castLimit).map((person) => ({ ...person, photoUrl: uploaded.get(person.photoUrl) ?? person.photoUrl })),
      }
      const imported = await api.importAsianWiki(importedPreview, status, castLimit)
      setResult(imported)
      await onImported(imported.titleId)
    } catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }

  return <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="drawer import-drawer" aria-label="Import from AsianWiki">
      <header className="drawer-header"><div><p className="eyebrow">Automatic metadata</p><h2>Import from AsianWiki</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
      <div className="import-body">
        <form className="import-url" onSubmit={(event) => { event.preventDefault(); loadPreview() }}>
          <div className="field"><label htmlFor="asianwiki-url">AsianWiki title URL</label><div className="import-url-row"><input id="asianwiki-url" autoFocus required type="url" disabled={busy} value={url} onChange={(event) => { setUrl(event.target.value); setPreview(null); setResult(null); setError('') }} placeholder="https://asianwiki.com/..." /><button className="button secondary" disabled={busy}>{busy && !preview ? <LoaderCircle className="spin" /> : <Download />}Preview</button></div></div>
        </form>
        {error && <div className="inline-error">{error}</div>}
        <details className="import-saved">
          <summary>Blocked? Import a saved page</summary>
          <p>Save the loaded AsianWiki title as a complete webpage to include images. Enter the same title URL above, select the .html file (up to 2 MB), and choose its companion folder below. HTML-only pages also work.</p>
          <form onSubmit={(event) => { event.preventDefault(); if (savedFile) loadPreview(savedFile) }}>
            <div className="field"><label htmlFor="asianwiki-html">Saved AsianWiki page</label><input id="asianwiki-html" type="file" accept=".html,.htm,text/html" required disabled={busy} onChange={(event) => { setSavedFile(event.target.files?.[0] ?? null); setPreview(null); setResult(null); setError('') }} /></div>
            <div className="field"><label htmlFor="asianwiki-images">Downloaded image folder (optional)</label><input id="asianwiki-images" type="file" {...{ webkitdirectory: '' }} multiple disabled={busy} onChange={(event) => { setSavedImages(Array.from(event.target.files ?? [])); setPreview(null); setResult(null); setError(''); setMissingImages(0) }} /><small>Choose the folder saved beside the HTML, often ending in “_files”. Only matching poster and cast images are imported. JPEG, PNG, GIF, and WebP are supported, up to 5 MB each.</small></div>
            <button className="button secondary" disabled={busy || !savedFile || !url.trim()}><Download />Preview saved HTML</button>
          </form>
        </details>
        {preview && missingImages > 0 && <div className="inline-error">{missingImages} downloaded {missingImages === 1 ? 'image was' : 'images were'} not found. Select the companion image folder and preview again to include them.</div>}
        {preview && localImages.size > 0 && <p className="import-image-count">{localImages.size} downloaded {localImages.size === 1 ? 'image' : 'images'} matched. Images for the selected cast and poster will be saved with your library when you import.</p>}
        {!preview && !busy && <div className="import-empty"><Download /><h3>Paste one title page</h3><p>Scene Map will collect its poster, year, episode count, cast profiles, character names, and source links.</p></div>}
        {busy && !preview && <div className="import-empty"><LoaderCircle className="spin" /><h3>Reading AsianWiki...</h3><p>Large cast pages can take a few seconds.</p></div>}
        {preview && <>
          <section className="import-preview-head"><Artwork src={preview.posterUrl} name={preview.name} /><div><span>{preview.type} · {preview.year ?? 'Year unknown'}</span><h3>{preview.name}</h3><small>{preview.episodesTotal ? `${preview.episodesTotal} episodes · ` : ''}${preview.cast.length} cast members found</small><a href={preview.sourceUrl} target="_blank" rel="noreferrer">View source <ExternalLink /></a></div></section>
          <section className="import-settings">
            <div className="field"><label>Add to</label><select value={status} onChange={(event) => setStatus(event.target.value as WatchStatus)}><option value="watchlist">Watchlist</option><option value="watching">Watching</option><option value="completed">Completed</option><option value="paused">Paused</option><option value="dropped">Dropped</option></select></div>
            <div className="field"><label>Cast depth</label><select value={castLimit} onChange={(event) => setCastLimit(Number(event.target.value))}><option value={Math.min(10, preview.cast.length)}>Principal cast ({Math.min(10, preview.cast.length)})</option><option value={Math.min(25, preview.cast.length)}>Expanded cast ({Math.min(25, preview.cast.length)})</option><option value={preview.cast.length}>Everyone ({preview.cast.length})</option></select></div>
          </section>
          <section className="import-cast"><div className="section-heading"><h3>Cast preview</h3><span>Importing {castLimit}</span></div><div>{preview.cast.slice(0, castLimit).map((person, index) => <div className="import-person" key={person.asianwikiUrl}><span>{index + 1}</span><Artwork kind="person" src={person.photoUrl} name={person.name} /><div><strong>{person.name}</strong><small>{person.characterName || person.role}</small></div><em>{person.role}</em></div>)}</div></section>
          {result && <div className="import-success"><Check /><div><strong>{result.created ? 'Title imported' : 'Existing title updated'}</strong><span>{result.peopleCreated} new people and {result.creditsCreated} new connections added.</span></div></div>}
          <footer className="drawer-actions"><button className="button primary" type="button" disabled={busy || !!result} onClick={runImport}>{busy ? <LoaderCircle className="spin" /> : <Download />}{busy ? 'Importing...' : `Import ${castLimit} cast members`}</button></footer>
        </>}
      </div>
    </aside>
  </div>
}

const message = (error: unknown) => error instanceof Error ? error.message : 'Could not import this page'
