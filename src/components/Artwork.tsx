import { Clapperboard, UserRound } from 'lucide-react'

export function Artwork({ src, name, kind = 'title', className = '' }: {
  src?: string
  name: string
  kind?: 'title' | 'person'
  className?: string
}) {
  return (
    <div className={`artwork ${kind === 'person' ? 'artwork-person' : ''} ${className}`}>
      {src ? <img src={src} alt="" /> : kind === 'person' ? <UserRound /> : <Clapperboard />}
      <span className="artwork-initials">{initials(name)}</span>
    </div>
  )
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}
