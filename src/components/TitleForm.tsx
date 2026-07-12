import { useEffect, useState } from 'react'
import { ExternalLink, Link2, Network, Save, Trash2, X } from 'lucide-react'
import type { Credit, Person, Title, TitleDraft, WatchStatus } from '../types'
import { Artwork } from './Artwork'

const empty: TitleDraft = {
  name: '', type: 'series', year: new Date().getFullYear(), status: 'watchlist',
  episodesWatched: 0, episodesTotal: 16, rating: null, posterUrl: '', asianwikiUrl: '', notes: '',
}

export function TitleForm({ title, titles, people, credits, onClose, onSave, onDelete, onAddCredit, onDeleteCredit, onOpenTitle }: {
  title: Title | null | undefined
  titles: Title[]
  people: Person[]
  credits: Credit[]
  onClose: () => void
  onSave: (draft: TitleDraft) => Promise<void>
  onDelete: (() => Promise<void>) | null
  onAddCredit: (personId: number, characterName: string, role: string) => Promise<void>
  onDeleteCredit: (id: number) => Promise<void>
  onOpenTitle: (title: Title) => void
}) {
  const [draft, setDraft] = useState<TitleDraft>(title ? pickDraft(title) : empty)
  const [personId, setPersonId] = useState('')
  const [character, setCharacter] = useState('')
  const [role, setRole] = useState('Cast')
  const [saving, setSaving] = useState(false)
  const [connectionsOnly, setConnectionsOnly] = useState(false)
  const titleCredits = title ? credits.filter((credit) => credit.titleId === title.id) : []
  const visibleCredits = connectionsOnly
    ? titleCredits.filter((credit) => credits.some((other) => other.personId === credit.personId && other.titleId !== title?.id))
    : titleCredits
  const connectedCastCount = titleCredits.filter((credit) => credits.some((other) => other.personId === credit.personId && other.titleId !== title?.id)).length
  const availablePeople = people.filter((person) => !titleCredits.some((credit) => credit.personId === person.id))

  useEffect(() => setDraft(title ? pickDraft(title) : empty), [title])
  const field = <K extends keyof TitleDraft>(key: K, value: TitleDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" aria-label={title ? `Edit ${title.name}` : 'Add title'}>
        <header className="drawer-header">
          <div><p className="eyebrow">{title ? 'Title details' : 'New title'}</p><h2>{title?.name || 'Add to your library'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>

        <form onSubmit={async (event) => { event.preventDefault(); setSaving(true); await onSave(draft).finally(() => setSaving(false)) }}>
          <div className="form-intro">
            <Artwork src={draft.posterUrl} name={draft.name || 'New title'} />
            <div className="field grow"><label>Title</label><input autoFocus required value={draft.name} onChange={(e) => field('name', e.target.value)} placeholder="Drama or movie name" /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Format</label><select value={draft.type} onChange={(e) => field('type', e.target.value as TitleDraft['type'])}><option value="series">Series</option><option value="movie">Movie</option></select></div>
            <div className="field"><label>Release year</label><input type="number" min="1900" max="2100" value={draft.year ?? ''} onChange={(e) => field('year', e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="field"><label>Status</label><select value={draft.status} onChange={(e) => {
              const status = e.target.value as WatchStatus
              setDraft((current) => ({
                ...current,
                status,
                episodesWatched: status === 'completed' && current.episodesTotal !== null
                  ? current.episodesTotal
                  : current.episodesWatched,
              }))
            }}>{statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>
            <div className="field"><label>Rating / 10</label><input type="number" min="0" max="10" step="0.5" value={draft.rating ?? ''} onChange={(e) => field('rating', e.target.value ? Number(e.target.value) : null)} placeholder="Not rated" /></div>
            {draft.type === 'series' && <><div className="field"><label>Episodes watched</label><input type="number" min="0" value={draft.episodesWatched} onChange={(e) => field('episodesWatched', Number(e.target.value))} /></div><div className="field"><label>Total episodes</label><input type="number" min="1" value={draft.episodesTotal ?? ''} onChange={(e) => field('episodesTotal', e.target.value ? Number(e.target.value) : null)} /></div></>}
          </div>
          <div className="field"><label>Poster image URL</label><input type="url" value={draft.posterUrl} onChange={(e) => field('posterUrl', e.target.value)} placeholder="https://..." /></div>
          <div className="field"><label>AsianWiki URL</label><div className="input-action"><input type="url" value={draft.asianwikiUrl} onChange={(e) => field('asianwikiUrl', e.target.value)} placeholder="https://asianwiki.com/..." />{draft.asianwikiUrl && <a href={draft.asianwikiUrl} target="_blank" rel="noreferrer" aria-label="Open AsianWiki"><ExternalLink /></a>}</div></div>
          <div className="field"><label>Notes & review</label><textarea rows={5} value={draft.notes} onChange={(e) => field('notes', e.target.value)} placeholder="What worked, favorite moments, whether you'd rewatch..." /></div>

          {title && <TitleActions className="drawer-actions drawer-actions-before-cast" onDelete={onDelete} saving={saving} />}

          {title && <section className="cast-editor connection-browser">
            <div className="section-heading connection-heading"><div><p className="eyebrow">Connections</p><h3>Cast history</h3></div><span>{connectedCastCount} of {titleCredits.length} connected elsewhere</span></div>
            <div className="connection-filter" role="group" aria-label="Filter cast connections">
              <button type="button" className={!connectionsOnly ? 'active' : ''} onClick={() => setConnectionsOnly(false)}>All cast <span>{titleCredits.length}</span></button>
              <button type="button" className={connectionsOnly ? 'active' : ''} onClick={() => setConnectionsOnly(true)}><Network />Shared history <span>{connectedCastCount}</span></button>
            </div>
            <div className="credit-list connection-list">
              {visibleCredits.map((credit) => {
                const person = people.find((item) => item.id === credit.personId)
                const otherCredits = credits.filter((other) => other.personId === credit.personId && other.titleId !== title.id)
                return <div className={`credit-row connection-row ${otherCredits.length ? 'multi-connected' : ''}`} key={credit.id}>
                  <div className="connection-person"><Artwork kind="person" src={person?.photoUrl} name={credit.personName} /><div><strong>{credit.personName}</strong><span>{credit.characterName || credit.role} · {credit.role}</span></div>{otherCredits.length > 0 && <em><Link2 />{otherCredits.length} other {otherCredits.length === 1 ? 'title' : 'titles'}</em>}<button type="button" className="icon-button subtle" onClick={() => onDeleteCredit(credit.id)} aria-label={`Remove ${credit.personName}`}><X /></button></div>
                  {otherCredits.length ? <div className="also-in"><span>Also in your library</span><div>{otherCredits.map((other) => {
                    const linkedTitle = titles.find((item) => item.id === other.titleId)
                    return linkedTitle ? <button type="button" key={other.id} onClick={() => onOpenTitle(linkedTitle)}><Artwork src={linkedTitle.posterUrl} name={linkedTitle.name} /><span><strong>{linkedTitle.name}</strong><small>{other.characterName || other.role}</small></span></button> : null
                  })}</div></div> : <p className="no-shared-titles">No other titles in your library yet</p>}
                </div>
              })}
              {!titleCredits.length && <p className="empty-copy">Connect cast members to build this title's cast history.</p>}
              {!!titleCredits.length && !visibleCredits.length && <div className="connection-empty"><Network /><strong>No shared history yet</strong><span>None of this cast appears in another title in your library.</span></div>}
            </div>
            {!!availablePeople.length && <div className="add-credit">
              <select aria-label="Cast member" value={personId} onChange={(e) => setPersonId(e.target.value)}><option value="">Select person...</option>{availablePeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
              <input value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="Character" />
              <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option>Lead</option><option>Supporting</option><option>Cameo</option><option>Cast</option></select>
              <button type="button" className="button secondary" disabled={!personId} onClick={async () => { await onAddCredit(Number(personId), character, role); setPersonId(''); setCharacter('') }}>Connect</button>
            </div>}
          </section>}

          <TitleActions className="drawer-actions" onDelete={onDelete} saving={saving} />
        </form>
      </aside>
    </div>
  )
}

function TitleActions({ className, onDelete, saving }: {
  className: string
  onDelete: (() => Promise<void>) | null
  saving: boolean
}) {
  return <div className={className}>
    {onDelete && <button type="button" className="button danger" onClick={onDelete}><Trash2 />Delete</button>}
    <button type="submit" className="button primary" disabled={saving}><Save />{saving ? 'Saving...' : 'Save title'}</button>
  </div>
}

const statusOptions: WatchStatus[] = ['watchlist', 'watching', 'completed', 'paused', 'dropped']
const label = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)
const pickDraft = ({ name, type, year, status, episodesWatched, episodesTotal, rating, posterUrl, asianwikiUrl, notes }: Title): TitleDraft =>
  ({ name, type, year, status, episodesWatched, episodesTotal, rating, posterUrl, asianwikiUrl, notes })
