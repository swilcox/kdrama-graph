import { useState } from 'react'
import { Check, Download, ExternalLink, LoaderCircle, X } from 'lucide-react'
import { api } from '../api'
import type { AsianWikiPreview, WatchStatus } from '../types'
import { Artwork } from './Artwork'

export function ImportAsianWiki({ onClose, onImported }: { onClose: () => void; onImported: (titleId: number) => Promise<void> }) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<AsianWikiPreview | null>(null)
  const [status, setStatus] = useState<WatchStatus>('watchlist')
  const [castLimit, setCastLimit] = useState(500)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ created: boolean; peopleCreated: number; creditsCreated: number } | null>(null)

  const loadPreview = async () => {
    setBusy(true); setError(''); setResult(null)
    try {
      const data = await api.previewAsianWiki(url)
      setPreview(data)
      setCastLimit(data.cast.length)
    } catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }
  const runImport = async () => {
    if (!preview) return
    setBusy(true); setError('')
    try {
      const imported = await api.importAsianWiki(preview, status, castLimit)
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
          <div className="field"><label>AsianWiki title URL</label><div className="import-url-row"><input autoFocus required type="url" value={url} onChange={(event) => { setUrl(event.target.value); setPreview(null); setResult(null) }} placeholder="https://asianwiki.com/..." /><button className="button secondary" disabled={busy}>{busy && !preview ? <LoaderCircle className="spin" /> : <Download />}Preview</button></div></div>
        </form>
        {error && <div className="inline-error">{error}</div>}
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
