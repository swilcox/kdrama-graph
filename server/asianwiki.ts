import * as cheerio from 'cheerio'

const BASE = 'https://asianwiki.com'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125 Safari/537.36 SceneMap/0.1'

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

export async function previewAsianWiki(inputUrl: string): Promise<AsianWikiPreview> {
  const sourceUrl = normalizeAsianWikiUrl(inputUrl)
  const pageName = decodeURIComponent(new URL(sourceUrl).pathname.slice(1))
  const printableUrl = `${BASE}/index.php?title=${encodeURIComponent(pageName)}&printable=yes`
  const response = await fetch(printableUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`AsianWiki returned HTTP ${response.status}`)
  const html = await response.text()
  if (html.includes('Attention Required!') || html.includes('cf-error-details')) {
    throw new Error('AsianWiki blocked the request. Wait a few minutes and try again.')
  }
  return parseAsianWikiHtml(html, sourceUrl)
}

export function normalizeAsianWikiUrl(input: string) {
  let url: URL
  try { url = new URL(input.trim()) } catch { throw new Error('Enter a complete AsianWiki URL') }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host !== 'asianwiki.com') throw new Error('Only asianwiki.com URLs can be imported')
  let pageName = url.pathname.replace(/^\/+|\/+$/g, '')
  if (pageName === 'index.php') pageName = url.searchParams.get('title') || ''
  if (!pageName || pageName.includes('/')) throw new Error('This does not look like an AsianWiki title page')
  return new URL(`/${pageName}`, BASE).toString()
}

export function parseAsianWikiHtml(html: string, sourceUrl: string): AsianWikiPreview {
  const $ = cheerio.load(html)
  const content = $('#mw-content-text')
  const pageTitle = $('h1').first().text().trim()
  if (!pageTitle || !content.length || !content.find('#Profile').length) throw new Error('Could not recognize this AsianWiki title page')

  const profile = new Map<string, string>()
  const profileHeading = content.find('#Profile').closest('h2')
  profileHeading.next('ul').find('li').each((_, element) => {
    const key = $(element).find('b').first().text().replace(':', '').trim()
    const value = $(element).clone().find('b').first().remove().end().text().trim()
    if (key) profile.set(key, value)
  })
  const type: 'series' | 'movie' = profile.has('Movie') ? 'movie' : 'series'
  const profileTitle = profile.get(type === 'movie' ? 'Movie' : 'Drama') || pageTitle
  const name = profileTitle.split(/\s+\/\s+|\s+\(/)[0].trim() || pageTitle
  const date = profile.get('Release Date') || profile.get('Release Dates') || ''
  const yearMatch = date.match(/\b(19|20)\d{2}\b/)
  const episodeText = profile.get('Episodes') || ''
  const episodesTotal = type === 'series' ? parsePositiveInt(episodeText) : null
  const posterSrc = content.find('.thumb.tright img.thumbimage').first().attr('src') || content.find('.thumb.tright img').first().attr('src') || ''
  const castHeading = content.find('#Cast').closest('h2')
  const cast: AsianWikiPreview['cast'] = []
  let section = 'Lead'

  castHeading.nextUntil('h2').each((_, element) => {
    if (element.tagName === 'h3') {
      const heading = $(element).text().trim().toLowerCase()
      section = heading.includes('cameo') || heading.includes('special appearance') ? 'Cameo' : 'Supporting'
      return
    }
    if (element.tagName !== 'table') return
    const table = $(element)
    const imageLinks = table.find('a:has(img)').filter((_, anchor) => isPersonPath($(anchor).attr('href')))
    imageLinks.each((index, anchor) => {
      const href = $(anchor).attr('href') || ''
      const photo = $(anchor).find('img').attr('src') || ''
      const nameAnchor = table.find(`a[href="${escapeSelectorValue(href)}"]`).filter((_, candidate) => !$(candidate).find('img').length).first()
      const personName = nameAnchor.text().trim() || $(anchor).attr('title')?.replace(/ \(\d{4}\)$/, '') || ''
      if (!personName || cast.some((person) => person.asianwikiUrl.endsWith(href))) return
      const row = nameAnchor.closest('tr')
      const column = nameAnchor.closest('td').index()
      const characterName = cleanText(row.next('tr').find('td').eq(column).text())
      cast.push({
        name: personName,
        asianwikiUrl: absolute(href),
        photoUrl: absolute(photo),
        characterName,
        role: section === 'Lead' && index < 4 ? 'Lead' : section,
        billingOrder: cast.length,
      })
    })
  })
  if (!cast.length) throw new Error('No cast table was found on this AsianWiki page')
  return {
    sourceUrl, name, type, year: yearMatch ? Number(yearMatch[0]) : null,
    episodesTotal, posterUrl: absolute(posterSrc), cast,
  }
}

function absolute(path: string) {
  if (!path) return ''
  return new URL(path, BASE).toString()
}

function isPersonPath(path?: string) {
  return !!path && path.startsWith('/') && !path.startsWith('/File:') && !path.includes(':')
}

function parsePositiveInt(value: string) {
  const parsed = Number(value.match(/\d+/)?.[0])
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeSelectorValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
