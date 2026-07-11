import { useMemo } from 'react'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react'
import { Clapperboard, UserRound } from 'lucide-react'
import type { Credit, Person, Title } from '../types'
import { Artwork } from './Artwork'

type GraphData = { label: string; subtitle: string; image: string; kind: 'title' | 'person'; entityId: number }

function EntityNode({ data }: NodeProps<Node<GraphData>>) {
  return <div className={`graph-node ${data.kind}`}>
    <Handle type="target" position={Position.Left} />
    <Artwork kind={data.kind} src={data.image} name={data.label} />
    <div><strong>{data.label}</strong><span>{data.subtitle}</span></div>
    {data.kind === 'title' ? <Clapperboard /> : <UserRound />}
    <Handle type="source" position={Position.Right} />
  </div>
}

const nodeTypes = { entity: EntityNode }

export function RelationshipGraph({ titles, people, credits, focus, onSelect }: {
  titles: Title[]
  people: Person[]
  credits: Credit[]
  focus: string
  onSelect: (kind: 'title' | 'person', id: number) => void
}) {
  const { nodes, edges } = useMemo(() => buildGraph(titles, people, credits, focus), [titles, people, credits, focus])
  return <div className="graph-canvas">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.25} maxZoom={1.8}
      onNodeClick={(_, node) => onSelect((node.data as GraphData).kind, (node.data as GraphData).entityId)}>
      <Background color="#d4d2cb" gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap nodeColor={(node) => (node.data.kind === 'person' ? '#28786f' : '#d25c3b')} maskColor="rgba(244,243,239,.75)" />
    </ReactFlow>
    {!nodes.length && <div className="graph-empty"><Clapperboard /><h3>No connections found</h3><p>Add cast members to a title or clear your search.</p></div>}
  </div>
}

function buildGraph(titles: Title[], people: Person[], credits: Credit[], focus: string) {
  const query = focus.trim().toLowerCase()
  let visibleCredits = credits
  if (query) {
    const matchingTitleIds = new Set(titles.filter((t) => t.name.toLowerCase().includes(query)).map((t) => t.id))
    const matchingPersonIds = new Set(people.filter((p) => p.name.toLowerCase().includes(query)).map((p) => p.id))
    const adjacentTitleIds = new Set<number>(matchingTitleIds)
    const adjacentPersonIds = new Set<number>(matchingPersonIds)
    credits.forEach((credit) => {
      if (matchingTitleIds.has(credit.titleId) || matchingPersonIds.has(credit.personId)) {
        adjacentTitleIds.add(credit.titleId)
        adjacentPersonIds.add(credit.personId)
      }
    })
    visibleCredits = credits.filter((credit) => adjacentTitleIds.has(credit.titleId) && adjacentPersonIds.has(credit.personId))
  }
  const titleIds = new Set(visibleCredits.map((c) => c.titleId))
  const personIds = new Set(visibleCredits.map((c) => c.personId))
  const visibleTitles = titles.filter((t) => titleIds.has(t.id))
  const visiblePeople = people.filter((p) => personIds.has(p.id))
  const rows = Math.max(visibleTitles.length, visiblePeople.length)
  const spacing = Math.max(120, Math.min(180, 720 / Math.max(rows, 1)))
  const titleNodes: Node<GraphData>[] = visibleTitles.map((title, index) => ({
    id: `title-${title.id}`, type: 'entity', position: { x: 80 + (index % 2) * 35, y: 70 + index * spacing },
    data: { label: title.name, subtitle: `${title.year ?? 'Year unknown'} · ${title.status}`, image: title.posterUrl, kind: 'title', entityId: title.id },
  }))
  const personNodes: Node<GraphData>[] = visiblePeople.map((person, index) => ({
    id: `person-${person.id}`, type: 'entity', position: { x: 540 + (index % 2) * 35, y: 70 + index * spacing },
    data: { label: person.name, subtitle: `${person.titleCount} ${person.titleCount === 1 ? 'title' : 'titles'}`, image: person.photoUrl, kind: 'person', entityId: person.id },
  }))
  const edges: Edge[] = visibleCredits.map((credit) => ({
    id: `credit-${credit.id}`, source: `title-${credit.titleId}`, target: `person-${credit.personId}`,
    label: credit.characterName || credit.role, type: 'smoothstep', animated: credit.role === 'Lead',
    style: { stroke: credit.role === 'Lead' ? '#d25c3b' : '#9b9b92', strokeWidth: credit.role === 'Lead' ? 2 : 1.5 },
    labelStyle: { fontSize: 10, fill: '#66665f' }, labelBgStyle: { fill: '#f4f3ef', fillOpacity: 0.92 },
  }))
  return { nodes: [...titleNodes, ...personNodes], edges }
}
