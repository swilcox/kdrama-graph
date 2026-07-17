import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Clapperboard, Download, ExternalLink, Film, Grid3X3, LayoutDashboard, Network, Plus, Search, Star, Tag, Tv, UserRound, UsersRound, X } from 'lucide-react'
import { api } from './api'
import { Artwork } from './components/Artwork'
import { PersonForm } from './components/PersonForm'
import { TitleForm } from './components/TitleForm'
import { ImportAsianWiki } from './components/ImportAsianWiki'
import type { Person, PersonDraft, Snapshot, Title, TitleDraft, WatchStatus } from './types'

type View = 'dashboard' | 'library' | 'people'

export default function App() {
  const [data, setData] = useState<Snapshot>({ titles: [], people: [], credits: [], tags: [], titleLinks: [] })
  const [view, setView] = useState<View>('dashboard')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<WatchStatus | 'all'>('all')
  const [ratedOnly, setRatedOnly] = useState(false)
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
  const openLibrary = (onlyRated = false) => { setQuery(''); setStatus('all'); setRatedOnly(onlyRated); setView('library') }
  const openPeople = () => { setQuery(''); setView('people') }

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
        <NavButton icon={<Grid3X3 />} label="Library" active={view === 'library'} onClick={() => openLibrary()} count={data.titles.length} />
        <NavButton icon={<UsersRound />} label="People" active={view === 'people'} onClick={openPeople} count={data.people.length} />
      </nav>
    </aside>

    <main>
      <header className="topbar">
        <div className="mobile-brand"><Clapperboard /><strong>Scene Map</strong></div>
        <div className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === 'people' ? 'Search people' : 'Search your library'} /></div>
        <div className="topbar-actions"><button className="button secondary import-button" onClick={() => setImporting(true)}><Download />Import</button><button className="button primary" onClick={() => view === 'people' ? setEditingPerson(null) : setEditingTitle(null)}><Plus />{view === 'people' ? 'Add person' : 'Add title'}</button></div>
      </header>

      {error && <div className="error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      {loading ? <div className="loading"><Clapperboard /><span>Opening your library...</span></div> : <>
        {view === 'dashboard' && <Dashboard data={data} openTitle={setEditingTitle} openPerson={setEditingPerson} openPeople={openPeople} openLibrary={openLibrary} />}
        {view === 'library' && <Library titles={filteredTitles} tags={data.tags} status={status} setStatus={setStatus} ratedOnly={ratedOnly} setRatedOnly={setRatedOnly} openTitle={setEditingTitle} />}
        {view === 'people' && <People people={filteredPeople} credits={data.credits} titles={data.titles} openPerson={setEditingPerson} />}
      </>}
    </main>

    {editingTitle !== undefined && <TitleForm title={editingTitle} titles={data.titles} people={data.people} credits={data.credits} tags={data.tags} titleLinks={data.titleLinks} onClose={() => setEditingTitle(undefined)} onSave={saveTitle}
      onDelete={editingTitle ? async () => { if (confirm(`Delete ${editingTitle.name}?`)) { await api.deleteTitle(editingTitle.id); await reload(); setEditingTitle(undefined) } } : null}
      onAddCredit={async (personId, characterName, role) => { if (!editingTitle) return; await api.setCredit({ titleId: editingTitle.id, personId, characterName, role }); await reload() }}
      onDeleteCredit={async (id) => { await api.deleteCredit(id); await reload() }}
      onAddTitleLink={async (targetTitleId, episode, note) => { if (!editingTitle) return; await api.createTitleLink({ sourceTitleId: editingTitle.id, targetTitleId, episode, note }); await reload() }}
      onDeleteTitleLink={async (id) => { await api.deleteTitleLink(id); await reload() }} onOpenTitle={setEditingTitle} onOpenPerson={setEditingPerson} />}
    {editingPerson !== undefined && <PersonForm person={editingPerson || undefined} credits={data.credits} titles={data.titles} onClose={() => setEditingPerson(undefined)} onSave={savePerson} />}
    {importing && <ImportAsianWiki onClose={() => setImporting(false)} onImported={async () => { await reload() }} />}
    <MobileNav view={view} setView={setView} openLibrary={openLibrary} openPeople={openPeople} />
  </div>
}

function Dashboard({ data, openTitle, openPerson, openPeople, openLibrary }: { data: Snapshot; openTitle: (title: Title) => void; openPerson: (person: Person) => void; openPeople: () => void; openLibrary: (ratedOnly?: boolean) => void }) {
  const watching = data.titles.filter((title) => title.status === 'watching')
  const completed = data.titles.filter((title) => title.status === 'completed')
  const rated = data.titles.filter((title) => title.rating !== null)
  const avg = rated.length ? rated.reduce((sum, title) => sum + (title.rating || 0), 0) / rated.length : 0
  const connected = [...data.people].sort((a, b) => b.titleCount - a.titleCount).slice(0, 5)
  return <div className="page dashboard-page">
    <PageTitle eyebrow="Your viewing journal" title="Good evening, Steven" aside={`${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`} />
    <section className="stat-band">
      <Stat icon={<Clapperboard />} label="In your library" value={data.titles.length} detail={`${data.titles.filter((t) => t.type === 'series').length} series · ${data.titles.filter((t) => t.type === 'movie').length} movies`} onClick={() => openLibrary()} />
      <Stat icon={<Tv />} label="Watching now" value={watching.length} detail={`${watching.reduce((sum, t) => sum + t.episodesWatched, 0)} episodes logged`} />
      <Stat icon={<Star />} label="Average rating" value={avg ? avg.toFixed(1) : '—'} detail={`${rated.length} rated titles`} onClick={() => openLibrary(true)} />
      <Stat icon={<Network />} label="Connections" value={data.credits.length} detail={`${data.people.length} people mapped`} onClick={openPeople} />
    </section>
    <div className="dashboard-grid">
      <section className="work-section wide"><SectionHeader title="Continue watching" action="View library" onClick={() => openLibrary()} />
        <div className="continue-list">{watching.map((title) => <button key={title.id} onClick={() => openTitle(title)} className="continue-item"><Artwork src={title.posterUrl} name={title.name} /><div className="continue-main"><span className="type-label">{title.type} · {title.year}</span><strong>{title.name}</strong><div className="progress-track"><i style={{ width: `${title.episodesTotal ? Math.min(100, title.episodesWatched / title.episodesTotal * 100) : 0}%` }} /></div><small>Episode {title.episodesWatched} of {title.episodesTotal ?? '?'}</small></div><span className="rating">{title.rating ? <><Star />{title.rating}</> : 'Not rated'}</span></button>)}{!watching.length && <Empty title="Nothing in progress" copy="Move a title to Watching to track episode progress." />}</div>
      </section>
      <section className="work-section"><SectionHeader title="Most connected" action="View people" onClick={openPeople} /><div className="connected-list">{connected.map((person, index) => <button type="button" key={person.id} onClick={() => openPerson(person)}><span className="rank">0{index + 1}</span><Artwork kind="person" src={person.photoUrl} name={person.name} /><div><strong>{person.name}</strong><small>{person.titleCount} linked {person.titleCount === 1 ? 'title' : 'titles'}</small></div><div className="connection-bars">{Array.from({ length: Math.max(1, person.titleCount) }).map((_, i) => <i key={i} />)}</div></button>)}</div></section>
      <section className="work-section wide"><SectionHeader title="Recently completed" action={`${completed.length} total`} /><div className="poster-strip">{completed.slice(0, 6).map((title) => <button key={title.id} onClick={() => openTitle(title)}><Artwork src={title.posterUrl} name={title.name} /><span><strong>{title.name}</strong><small>{title.year} · {title.rating ? `${title.rating}/10` : 'Unrated'}</small></span></button>)}</div></section>
      <section className="insight-panel"><BarChart3 /><p>Actors in your library have appeared across <strong>{new Set(data.credits.map((c) => c.titleId)).size}</strong> connected titles.</p><button onClick={openPeople}>Browse people</button></section>
    </div>
  </div>
}

function Library({ titles, tags, status, setStatus, ratedOnly, setRatedOnly, openTitle }: { titles: Title[]; tags: string[]; status: WatchStatus | 'all'; setStatus: (s: WatchStatus | 'all') => void; ratedOnly: boolean; setRatedOnly: (ratedOnly: boolean) => void; openTitle: (t: Title) => void }) {
  const [type, setType] = useState<'all' | Title['type']>('all')
  const [sort, setSort] = useState<'year-desc' | 'year-asc' | 'updated' | 'rating' | 'title' | 'status'>('year-desc')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const options: (WatchStatus | 'all')[] = ['all', 'watching', 'watchlist', 'completed', 'paused', 'dropped']
  const visibleTitles = useMemo(() => titles.filter((title) =>
    (type === 'all' || title.type === type)
    && (!ratedOnly || title.rating !== null)
    && selectedTags.every((tag) => title.tags.includes(tag))
  ).sort((a, b) => {
    if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name)
    if (sort === 'title') return a.name.localeCompare(b.name)
    if (sort === 'status') return options.indexOf(a.status) - options.indexOf(b.status) || a.name.localeCompare(b.name)
    if (sort === 'year-desc' || sort === 'year-asc') {
      if (a.year === null) return b.year === null ? a.name.localeCompare(b.name) : 1
      if (b.year === null) return -1
      return (sort === 'year-desc' ? b.year - a.year : a.year - b.year) || a.name.localeCompare(b.name)
    }
    return b.updatedAt.localeCompare(a.updatedAt)
  }), [titles, type, ratedOnly, selectedTags, sort])
  const availableTags = tags.filter((tag) => !selectedTags.includes(tag)).sort((a, b) => a.localeCompare(b))
  return <div className="page"><PageTitle eyebrow="All titles" title="Your library" aside={`${visibleTitles.length} ${visibleTitles.length === 1 ? 'title' : 'titles'}`} />
    <div className="library-controls"><div className="filter-tabs">{options.map((item) => <button className={status === item ? 'active' : ''} onClick={() => setStatus(item)} key={item}>{item === 'all' ? 'All' : titleCase(item)}</button>)}</div>
      <div className="library-selects"><label>Type<select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="all">All types</option><option value="series">Series</option><option value="movie">Movies</option></select></label><label>Rating<select value={ratedOnly ? 'rated' : 'all'} onChange={(e) => setRatedOnly(e.target.value === 'rated')}><option value="all">All ratings</option><option value="rated">Rated only</option></select></label><label>Sort<select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="year-desc">Release year: newest</option><option value="year-asc">Release year: oldest</option><option value="updated">Recently updated</option><option value="rating">Rating: high to low</option><option value="title">Title: A–Z</option><option value="status">Status</option></select></label></div>
    </div>
    {!!tags.length && <div className="tag-filters"><label htmlFor="library-tag-filter"><Tag />Tags</label><select id="library-tag-filter" value="" onChange={(e) => { if (e.target.value) setSelectedTags((current) => [...current, e.target.value]) }} disabled={!availableTags.length}><option value="">{availableTags.length ? 'Add a tag filter…' : 'All tags selected'}</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>{selectedTags.map((tag) => <button type="button" key={tag} onClick={() => setSelectedTags((current) => current.filter((item) => item !== tag))}>{tag}<X /></button>)}{!!selectedTags.length && <small>Matching all selected tags</small>}</div>}
    <div className="title-table"><div className="table-head"><span>Title</span><span>Status</span><span>Progress</span><span>Cast</span><span>Rating</span><span /></div>{visibleTitles.map((title) => <button className="title-row" key={title.id} onClick={() => openTitle(title)}><span className="title-cell"><Artwork src={title.posterUrl} name={title.name} /><span><strong>{title.name}</strong><small>{title.type === 'series' ? <Tv /> : <Film />}{title.type} · {title.year ?? 'Year unknown'}</small>{!!title.tags.length && <em>{title.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</em>}</span></span><span><Status status={title.status} /></span><span>{title.type === 'series' ? `${title.episodesWatched} / ${title.episodesTotal ?? '?'}` : title.status === 'completed' ? 'Watched' : '—'}</span><span>{title.castCount} people</span><span className="rating">{title.rating ? <><Star />{title.rating}</> : '—'}</span><span>{title.asianwikiUrl && <a href={title.asianwikiUrl} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" aria-label={`Open ${title.name} on AsianWiki`}><ExternalLink /></a>}</span></button>)}{!visibleTitles.length && <Empty title="No matching titles" copy="Try another filter or add something new." />}</div></div>
}

function People({ people, credits, titles, openPerson }: { people: Person[]; credits: Snapshot['credits']; titles: Title[]; openPerson: (p: Person) => void }) {
  const [sort, setSort] = useState<'name' | 'connections'>('name')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const sortedPeople = useMemo(() => people.filter((person) => !favoritesOnly || person.favorite).sort((a, b) => sort === 'connections'
    ? b.titleCount - a.titleCount || a.name.localeCompare(b.name)
    : a.name.localeCompare(b.name)), [people, sort, favoritesOnly])
  const creditsByPerson = useMemo(() => {
    const byPerson = new Map<number, Snapshot['credits']>()
    credits.forEach((credit) => {
      const personCredits = byPerson.get(credit.personId)
      if (personCredits) personCredits.push(credit)
      else byPerson.set(credit.personId, [credit])
    })
    return byPerson
  }, [credits])
  const titlesById = useMemo(() => new Map(titles.map((title) => [title.id, title])), [titles])
  return <div className="page"><PageTitle eyebrow="Cast index" title="People" aside={`${sortedPeople.length} ${sortedPeople.length === 1 ? 'person' : 'people'}`} />
    <div className="people-controls"><div className="filter-tabs" role="group" aria-label="Filter people">
      <button className={!favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(false)}>All</button>
      <button className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(true)}><Star />Favorites</button>
    </div><div className="filter-tabs" role="group" aria-label="Sort people">
      <button className={sort === 'name' ? 'active' : ''} onClick={() => setSort('name')}>Name</button>
      <button className={sort === 'connections' ? 'active' : ''} onClick={() => setSort('connections')}>Most connected</button>
    </div></div>
    <div className="people-grid">{sortedPeople.map((person) => { const links = creditsByPerson.get(person.id) || []; return <button className="person-card" key={person.id} onClick={() => openPerson(person)}><Artwork kind="person" src={person.photoUrl} name={person.name} /><div className="person-info"><div><strong>{person.name}{person.favorite && <Star className="favorite-star" />}</strong><span>{person.titleCount} linked {person.titleCount === 1 ? 'title' : 'titles'}</span>{person.notes && <small>{person.notes}</small>}</div><div className="person-titles">{links.slice(0, 3).map((credit) => <Artwork key={credit.id} src={titlesById.get(credit.titleId)?.posterUrl} name={credit.titleName} />)}</div></div></button>})}{!sortedPeople.length && <Empty title="No favorite people yet" copy="Open a person and mark them as a favorite." />}</div></div>
}

function PageTitle({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: string }) { return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{aside && <span>{aside}</span>}</div> }
function Stat({ icon, label, value, detail, onClick }: { icon: React.ReactNode; label: string; value: string | number; detail: string; onClick?: () => void }) {
  const content = <><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></>
  return onClick ? <button type="button" className="stat stat-link" onClick={onClick}>{content}</button> : <div className="stat">{content}</div>
}
function SectionHeader({ title, action, onClick }: { title: string; action: string; onClick?: () => void }) { return <header className="section-header"><h2>{title}</h2><button onClick={onClick} disabled={!onClick}>{action}</button></header> }
function NavButton({ icon, label, active, onClick, count }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number }) { return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button> }
function Status({ status }: { status: WatchStatus }) { return <span className={`status status-${status}`}>{titleCase(status)}</span> }
function Empty({ title, copy }: { title: string; copy: string }) { return <div className="empty"><Clapperboard /><strong>{title}</strong><span>{copy}</span></div> }
function MobileNav({ view, setView, openLibrary, openPeople }: { view: View; setView: (v: View) => void; openLibrary: () => void; openPeople: () => void }) { return <nav className="mobile-nav"><NavButton icon={<LayoutDashboard />} label="Overview" active={view === 'dashboard'} onClick={() => setView('dashboard')} /><NavButton icon={<Grid3X3 />} label="Library" active={view === 'library'} onClick={openLibrary} /><NavButton icon={<UserRound />} label="People" active={view === 'people'} onClick={openPeople} /></nav> }
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong'
