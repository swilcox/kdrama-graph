export type WatchStatus = 'watchlist' | 'watching' | 'completed' | 'paused' | 'dropped'

export type Title = {
  id: number
  name: string
  type: 'series' | 'movie'
  year: number | null
  status: WatchStatus
  episodesWatched: number
  episodesTotal: number | null
  rating: number | null
  posterUrl: string
  asianwikiUrl: string
  notes: string
  tags: string[]
  castCount: number
  updatedAt: string
}

export type Person = {
  id: number
  name: string
  photoUrl: string
  asianwikiUrl: string
  notes: string
  favorite: boolean
  titleCount: number
}

export type Credit = {
  id: number
  titleId: number
  personId: number
  characterName: string
  role: string
  billingOrder: number
  titleName: string
  personName: string
}

export type TitleLink = {
  id: number
  sourceTitleId: number
  targetTitleId: number
  sourceTitleName: string
  targetTitleName: string
  episode: number | null
  note: string
}

export type Snapshot = { titles: Title[]; people: Person[]; credits: Credit[]; tags: string[]; titleLinks: TitleLink[] }

export type TitleDraft = Omit<Title, 'id' | 'castCount' | 'updatedAt'>
export type PersonDraft = Omit<Person, 'id' | 'titleCount'>

export type AsianWikiPreview = {
  sourceUrl: string
  name: string
  type: 'series' | 'movie'
  year: number | null
  episodesTotal: number | null
  posterUrl: string
  cast: Array<{
    name: string
    asianwikiUrl: string
    photoUrl: string
    characterName: string
    role: string
    billingOrder: number
  }>
}
