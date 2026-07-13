import { useState } from 'react'
import { ExternalLink, Save, Star, X } from 'lucide-react'
import type { Credit, Person, PersonDraft, Title } from '../types'
import { Artwork } from './Artwork'

export function PersonForm({ person, credits, titles, onClose, onSave }: {
  person?: Person
  credits: Credit[]
  titles: Title[]
  onClose: () => void
  onSave: (draft: PersonDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<PersonDraft>(person ? { name: person.name, photoUrl: person.photoUrl, asianwikiUrl: person.asianwikiUrl, notes: person.notes, favorite: person.favorite } : { name: '', photoUrl: '', asianwikiUrl: '', notes: '', favorite: false })
  const connected = person ? credits.filter((credit) => credit.personId === person.id) : []
  return <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="drawer compact-drawer">
    <header className="drawer-header"><div><p className="eyebrow">{person ? 'Person details' : 'New person'}</p><h2>{person?.name || 'Add cast member'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
    <form onSubmit={async (event) => { event.preventDefault(); await onSave(draft) }}>
      <div className="form-intro"><Artwork kind="person" src={draft.photoUrl} name={draft.name || 'New person'} /><div className="field grow"><label>Name</label><input autoFocus required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div><button type="button" className={`favorite-toggle ${draft.favorite ? 'active' : ''}`} onClick={() => setDraft({ ...draft, favorite: !draft.favorite })} aria-pressed={draft.favorite}><Star />{draft.favorite ? 'Favorite' : 'Mark favorite'}</button></div>
      <div className="field"><label>Profile image URL</label><input type="url" value={draft.photoUrl} onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })} placeholder="https://..." /></div>
      <div className="field"><label>AsianWiki URL</label><div className="input-action"><input type="url" value={draft.asianwikiUrl} onChange={(e) => setDraft({ ...draft, asianwikiUrl: e.target.value })} placeholder="https://asianwiki.com/..." />{draft.asianwikiUrl && <a href={draft.asianwikiUrl} target="_blank" rel="noreferrer"><ExternalLink /></a>}</div></div>
      <div className="field"><label>Notes</label><textarea rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
      {person && <section className="cast-editor"><div className="section-heading"><h3>In your library</h3><span>{connected.length}</span></div><div className="mini-title-list">{connected.map((credit) => { const title = titles.find((item) => item.id === credit.titleId); return <div key={credit.id}><Artwork src={title?.posterUrl} name={credit.titleName} /><span><strong>{credit.titleName}</strong><small>{credit.characterName || credit.role}</small></span></div> })}</div></section>}
      <footer className="drawer-actions"><button className="button primary"><Save />Save person</button></footer>
    </form>
  </aside></div>
}
