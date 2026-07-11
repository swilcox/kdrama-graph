import type { AsianWikiPreview, PersonDraft, Snapshot, TitleDraft, WatchStatus } from './types'

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not save your changes')
  }
  return response.json()
}

export const api = {
  snapshot: () => request('/api/snapshot') as Promise<Snapshot>,
  createTitle: (body: TitleDraft) => request('/api/titles', { method: 'POST', body: JSON.stringify(body) }),
  updateTitle: (id: number, body: TitleDraft) => request(`/api/titles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTitle: (id: number) => request(`/api/titles/${id}`, { method: 'DELETE' }),
  createPerson: (body: PersonDraft) => request('/api/people', { method: 'POST', body: JSON.stringify(body) }),
  updatePerson: (id: number, body: PersonDraft) => request(`/api/people/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setCredit: (body: { titleId: number; personId: number; characterName: string; role: string }) =>
    request('/api/credits', { method: 'PUT', body: JSON.stringify(body) }),
  deleteCredit: (id: number) => request(`/api/credits/${id}`, { method: 'DELETE' }),
  previewAsianWiki: (url: string) => request('/api/import/asianwiki/preview', { method: 'POST', body: JSON.stringify({ url }) }) as Promise<AsianWikiPreview>,
  importAsianWiki: (preview: AsianWikiPreview, status: WatchStatus, castLimit: number) =>
    request('/api/import/asianwiki', { method: 'POST', body: JSON.stringify({ preview, status, castLimit }) }) as Promise<{ titleId: number; created: boolean; peopleCreated: number; creditsCreated: number }>,
}
