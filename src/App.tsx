import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Clapperboard, Download, ExternalLink, Film, Grid3X3, LayoutDashboard, Network, Plus, Search, Star, Tv, UserRound, UsersRound } from 'lucide-react'
import { api } from './api'
import { Artwork } from './components/Artwork'
import { PersonForm } from './components/PersonForm'
import { RelationshipGraph } from './components/RelationshipGraph'
import { TitleForm } from './components/TitleForm'
import { ImportAsianWiki } from './components/ImportAsianWiki'
import type { Person, PersonDraft, Snapshot, Title, TitleDraft, WatchStatus } from './types'

type View = 'dashboard' | 'library' | 'graph' | 'people'

export default function App() {
  const [data, setData] = useState<Snapshot>({ titles: [], people: [], credits: [] })
  const [view, setView] = useState<View>('dashboard')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<WatchStatus | 'all'>('all')
  const [editingTitle, setEditingTitle] = useState<Title | null | undefined>(undefined)
  const [editingPerson, setEditingPerson] = useState<Person | null | undefined>(undefined)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    try { setData(await api.snapshot()); setError('') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your library') }
    finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const filteredTitles = useMemo(() => data.titles.filter((title) =>
    (status === 'all' || title.status === status) && title.name.toLowerCase().includes(query.toLowerCase())), [data.titles, status, query])
  const filteredPeople = useMemo(() => data.people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase())), [data.people, query])

  const saveTitle = async (draft: TitleDraft) => {
    try {
      editingTitle ? await api.updateTitle(editingTitle.id, draft) : await api.createTitle(draft)
      await reload(); setEditingTitle(undefined)
    } catch (err) { setError(message(err)); throw err }
  }
  const savePerson = async (draft: PersonDraft) => {
    try {
      editingPerson ? await api.updatePerson(editingPerson.id, draft) : await api.createPerson(draft)
      await reload(); setEditingPerson(undefined)
    } catch (err) { setError(message(err)); throw err }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span><Clapperboard /></span><div><strong>Scene Map</strong><small>K-drama journal</small></div></div>
      <nav>
        <NavButton icon={<LayoutDashboard />} label="Overview" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <NavButton icon={<Grid3X3 />} label="Library" active={view === 'library'} onClick={() => setView('library')} count={data.titles.length} />
        <NavButton icon={<Network />} label="Graph" active={view === 'graph'} onClick={() => setView('graph')} />
        <NavButton icon={<UsersRound />} label="People" active={view === 'people'} onClick={() => setView('people')} count={data.people.length} />
      </nav>
      <div className="sidebar-foot"><div className="legend-item"><i className="title-dot" />Titles</div><div className="legend-item"><i className="person-dot" />People</div></div>
    </aside>

    <main>
      <header className="topbar">
        <div className="mobile-brand"><Clapperboard /><strong>Scene Map</strong></div>
        <div className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === 'people' ? 'Search people' : view === 'graph' ? 'Focus the graph' : 'Search your library'} /></div>
        <div className="topbar-actions"><button className="button secondary import-button" onClick={() => setImporting(true)}><Download />Import</button><button className="button primary" onClick={() => view === 'people' ? setEditingPerson(null) : setEditingTitle(null)}><Plus />{view === 'people' ? 'Add person' : 'Add title'}</button></div>
      </header>

      {error && <div className="error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      {loading ? <div className="loading"><Clapperboard /><span>Opening your library...</span></div> : <>
        {view === 'dashboard' && <Dashboard data={data} openTitle={setEditingTitle} goTo={setView} />}
        {view === 'library' && <Library titles={filteredTitles} status={status} setStatus={setStatus} openTitle={setEditingTitle} />}
        {view === 'graph' && <section className="graph-view"><PageTitle eyebrow="Relationship explorer" title="Your watch graph" aside={`${data.credits.length} connections`} /><div className="graph-legend"><span><i className="title-dot" />Title</span><span><i className="person-dot" />Person</span><span><i className="lead-line" />Lead role</span><p>Click any node to open its details.</p></div><RelationshipGraph titles={data.titles} people={data.people} credits={data.credits} focus={query} onSelect={(kind, id) => kind === 'title' ? setEditingTitle(data.titles.find((t) => t.id === id)) : setEditingPerson(data.people.find((p) => p.id === id))} /></section>}
        {view === 'people' && <People people={filteredPeople} credits={data.credits} titles={data.titles} openPerson={setEditingPerson} />}
      </>}
    </main>

    {editingTitle !== undefined && <TitleForm title={editingTitle} titles={data.titles} people={data.people} credits={data.credits} onClose={() => setEditingTitle(undefined)} onSave={saveTitle}
      onDelete={editingTitle ? async () => { if (confirm(`Delete ${editingTitle.name}?`)) { await api.deleteTitle(editingTitle.id); await reload(); setEditingTitle(undefined) } } : null}
      onAddCredit={async (personId, characterName, role) => { if (!editingTitle) return; await api.setCredit({ titleId: editingTitle.id, personId, characterName, role }); await reload() }}
      onDeleteCredit={async (id) => { await api.deleteCredit(id); await reload() }} onOpenTitle={setEditingTitle} />}
    {editingPerson !== undefined && <PersonForm person={editingPerson || undefined} credits={data.credits} titles={data.titles} onClose={() => setEditingPerson(undefined)} onSave={savePerson} />}
    {importing && <ImportAsianWiki onClose={() => setImporting(false)} onImported={async () => { await reload() }} />}
    <MobileNav view={view} setView={setView} />
  </div>
}

function Dashboard({ data, openTitle, goTo }: { data: Snapshot; openTitle: (title: Title) => void; goTo: (view: View) => void }) {
  const watching = data.titles.filter((title) => title.status === 'watching')
  const completed = data.titles.filter((title) => title.status === 'completed')
  const rated = data.titles.filter((title) => title.rating !== null)
  const avg = rated.length ? rated.reduce((sum, title) => sum + (title.rating || 0), 0) / rated.length : 0
  const connected = [...data.people].sort((a, b) => b.titleCount - a.titleCount).slice(0, 5)
  return <div className="page dashboard-page">
    <PageTitle eyebrow="Your viewing journal" title="Good evening, Steven" aside={`${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`} />
    <section className="stat-band">
      <Stat icon={<Clapperboard />} label="In your library" value={data.titles.length} detail={`${data.titles.filter((t) => t.type === 'series').length} series · ${data.titles.filter((t) => t.type === 'movie').length} movies`} />
      <Stat icon={<Tv />} label="Watching now" value={watching.length} detail={`${watching.reduce((sum, t) => sum + t.episodesWatched, 0)} episodes logged`} />
      <Stat icon={<Star />} label="Average rating" value={avg ? avg.toFixed(1) : '—'} detail={`${rated.length} rated titles`} />
      <Stat icon={<Network />} label="Connections" value={data.credits.length} detail={`${data.people.length} people mapped`} />
    </section>
    <div className="dashboard-grid">
      <section className="work-section wide"><SectionHeader title="Continue watching" action="View library" onClick={() => goTo('library')} />
        <div className="continue-list">{watching.map((title) => <button key={title.id} onClick={() => openTitle(title)} className="continue-item"><Artwork src={title.posterUrl} name={title.name} /><div className="continue-main"><span className="type-label">{title.type} · {title.year}</span><strong>{title.name}</strong><div className="progress-track"><i style={{ width: `${title.episodesTotal ? Math.min(100, title.episodesWatched / title.episodesTotal * 100) : 0}%` }} /></div><small>Episode {title.episodesWatched} of {title.episodesTotal ?? '?'}</small></div><span className="rating">{title.rating ? <><Star />{title.rating}</> : 'Not rated'}</span></button>)}{!watching.length && <Empty title="Nothing in progress" copy="Move a title to Watching to track episode progress." />}</div>
      </section>
      <section className="work-section"><SectionHeader title="Most connected" action="Open graph" onClick={() => goTo('graph')} /><div className="connected-list">{connected.map((person, index) => <div key={person.id}><span className="rank">0{index + 1}</span><Artwork kind="person" src={person.photoUrl} name={person.name} /><div><strong>{person.name}</strong><small>{person.titleCount} linked {person.titleCount === 1 ? 'title' : 'titles'}</small></div><div className="connection-bars">{Array.from({ length: Math.max(1, person.titleCount) }).map((_, i) => <i key={i} />)}</div></div>)}</div></section>
      <section className="work-section wide"><SectionHeader title="Recently completed" action={`${completed.length} total`} /><div className="poster-strip">{completed.slice(0, 6).map((title) => <button key={title.id} onClick={() => openTitle(title)}><Artwork src={title.posterUrl} name={title.name} /><span><strong>{title.name}</strong><small>{title.year} · {title.rating ? `${title.rating}/10` : 'Unrated'}</small></span></button>)}</div></section>
      <section className="insight-panel"><BarChart3 /><p>Actors in your library have appeared across <strong>{new Set(data.credits.map((c) => c.titleId)).size}</strong> connected titles.</p><button onClick={() => goTo('graph')}>Explore connections</button></section>
    </div>
  </div>
}

function Library({ titles, status, setStatus, openTitle }: { titles: Title[]; status: WatchStatus | 'all'; setStatus: (s: WatchStatus | 'all') => void; openTitle: (t: Title) => void }) {
  const options: (WatchStatus | 'all')[] = ['all', 'watching', 'watchlist', 'completed', 'paused', 'dropped']
  return <div className="page"><PageTitle eyebrow="All titles" title="Your library" aside={`${titles.length} ${titles.length === 1 ? 'title' : 'titles'}`} /><div className="filter-tabs">{options.map((item) => <button className={status === item ? 'active' : ''} onClick={() => setStatus(item)} key={item}>{item === 'all' ? 'All' : titleCase(item)}</button>)}</div><div className="title-table"><div className="table-head"><span>Title</span><span>Status</span><span>Progress</span><span>Cast</span><span>Rating</span><span /></div>{titles.map((title) => <button className="title-row" key={title.id} onClick={() => openTitle(title)}><span className="title-cell"><Artwork src={title.posterUrl} name={title.name} /><span><strong>{title.name}</strong><small>{title.type === 'series' ? <Tv /> : <Film />}{title.type} · {title.year ?? 'Year unknown'}</small></span></span><span><Status status={title.status} /></span><span>{title.type === 'series' ? `${title.episodesWatched} / ${title.episodesTotal ?? '?'}` : title.status === 'completed' ? 'Watched' : '—'}</span><span>{title.castCount} people</span><span className="rating">{title.rating ? <><Star />{title.rating}</> : '—'}</span><span>{title.asianwikiUrl && <a href={title.asianwikiUrl} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" aria-label={`Open ${title.name} on AsianWiki`}><ExternalLink /></a>}</span></button>)}{!titles.length && <Empty title="No matching titles" copy="Try another filter or add something new." />}</div></div>
}

function People({ people, credits, titles, openPerson }: { people: Person[]; credits: Snapshot['credits']; titles: Title[]; openPerson: (p: Person) => void }) {
  return <div className="page"><PageTitle eyebrow="Cast index" title="People" aside={`${people.length} people`} /><div className="people-grid">{people.map((person) => { const links = credits.filter((c) => c.personId === person.id); return <button className="person-card" key={person.id} onClick={() => openPerson(person)}><Artwork kind="person" src={person.photoUrl} name={person.name} /><div className="person-info"><div><strong>{person.name}</strong><span>{person.titleCount} linked {person.titleCount === 1 ? 'title' : 'titles'}</span></div><div className="person-titles">{links.slice(0, 3).map((credit) => { const title = titles.find((t) => t.id === credit.titleId); return <Artwork key={credit.id} src={title?.posterUrl} name={credit.titleName} /> })}</div></div></button>})}</div></div>
}

function PageTitle({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: string }) { return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{aside && <span>{aside}</span>}</div> }
function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) { return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }
function SectionHeader({ title, action, onClick }: { title: string; action: string; onClick?: () => void }) { return <header className="section-header"><h2>{title}</h2><button onClick={onClick} disabled={!onClick}>{action}</button></header> }
function NavButton({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number }) { return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button> }
function Status({ status }: { status: WatchStatus }) { return <span className={`status status-${status}`}>{titleCase(status)}</span> }
function Empty({ title, copy }: { title: string; copy: string }) { return <div className="empty"><Clapperboard /><strong>{title}</strong><span>{copy}</span></div> }
function MobileNav({ view, setView }: { view: View; setView: (v: View) => void }) { return <nav className="mobile-nav"><NavButton icon={<LayoutDashboard />} label="Overview" active={view === 'dashboard'} onClick={() => setView('dashboard')} /><NavButton icon={<Grid3X3 />} label="Library" active={view === 'library'} onClick={() => setView('library')} /><NavButton icon={<Network />} label="Graph" active={view === 'graph'} onClick={() => setView('graph')} /><NavButton icon={<UserRound />} label="People" active={view === 'people'} onClick={() => setView('people')} /></nav> }
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong'
