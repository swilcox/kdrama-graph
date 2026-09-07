import type { AsianWikiPreview } from './types.js'

type SavedImage = { name: string; webkitRelativePath: string }

function pathParts(path: string) {
  try { path = new URL(path).pathname } catch { path = path.split(/[?#]/)[0] }
  return path.split(/[\\/]/).filter((part) => part && part !== '.').map((part) => {
    try { return decodeURIComponent(part) } catch { return part }
  })
}

export function findSavedImage<T extends SavedImage>(source: string, files: T[]): T | undefined {
  const parts = pathParts(source)
  const candidates = files.filter((file) => file.name === parts.at(-1))
  if (candidates.length === 1) return candidates[0]
  const exact = candidates.filter((file) => {
    const relative = (file.webkitRelativePath || file.name).split('/')
    return relative.length > 1 && relative.length <= parts.length && relative.every((part, i) => part === parts[parts.length - relative.length + i])
  })
  return exact.length === 1 ? exact[0] : undefined
}

export function resolveSavedImages<T extends SavedImage>(preview: AsianWikiPreview, files: T[], imageUrl: (file: T) => string) {
  let missing = 0
  const resolve = (source: string) => {
    if (!source) return ''
    const file = findSavedImage(source, files)
    if (file) return imageUrl(file)
    if (!/^(https?:|data:|\/api\/)/i.test(source)) { missing++; return '' }
    return source
  }
  return {
    preview: { ...preview, posterUrl: resolve(preview.posterUrl), cast: preview.cast.map((person) => ({ ...person, photoUrl: resolve(person.photoUrl) })) },
    missing,
  }
}
