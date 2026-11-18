import sanitizeHtml from 'sanitize-html'
import { emptyStory, storyBlockNames, type EventStory, type StoryBlock } from './types'

const inline = (value: unknown): string =>
  sanitizeHtml(typeof value === 'string' ? value : '', {
    allowedTags: ['strong', 'b', 'em', 'i', 's', 'u', 'br', 'a', 'sub', 'sup', 'code'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false,
  })
const text = (value: unknown): string =>
  sanitizeHtml(typeof value === 'string' ? value : '', { allowedTags: [], allowedAttributes: {} })

// A versioned, small block vocabulary. Unknown or overlarge content is rejected,
// never silently discarded. Editor identifiers, URLs and arbitrary HTML stay out.
export function normalizeStory(value: unknown): EventStory {
  if (value == null) return { ...emptyStory, blocks: [] }
  if (JSON.stringify(value).length > 750_000)
    throw new Error('Het verhaal is te groot. Verdeel het over meerdere gebeurtenissen.')
  if (
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('blocks' in value) ||
    !Array.isArray(value.blocks)
  )
    throw new Error(
      'Dit verhaal heeft een onbekend opslagformaat. De bestaande inhoud is niet gewijzigd.',
    )
  let count = 0
  function block(raw: unknown, depth: number, parent?: string): StoryBlock {
    if (++count > 300 || depth > 12)
      throw new Error('Het verhaal bevat te veel of te diep geneste blokken.')
    if (
      !raw ||
      typeof raw !== 'object' ||
      !('name' in raw) ||
      typeof raw.name !== 'string' ||
      !storyBlockNames.includes(raw.name)
    )
      throw new Error('Dit blok wordt niet ondersteund. Gebruik de beschikbare verhaalblokken.')
    const name = raw.name
    const a =
      'attributes' in raw && raw.attributes && typeof raw.attributes === 'object'
        ? (raw.attributes as Record<string, unknown>)
        : {}
    const children = 'innerBlocks' in raw && Array.isArray(raw.innerBlocks) ? raw.innerBlocks : []
    if (name === 'core/list-item' && parent !== 'core/list')
      throw new Error('Een lijstitem hoort binnen een lijst.')
    if (parent === 'core/list' && name !== 'core/list-item')
      throw new Error('Een lijst bevat alleen lijstitems.')
    if (parent === 'familie/gallery' && name !== 'familie/image')
      throw new Error('Een galerij bevat alleen afbeeldingen.')
    if (
      !['core/list', 'core/list-item', 'core/quote', 'familie/gallery'].includes(name) &&
      children.length
    )
      throw new Error('Dit blok kan geen andere blokken bevatten.')
    let attributes: Record<string, unknown> = {}
    switch (name) {
      case 'core/paragraph':
      case 'core/list-item':
        attributes = { content: inline(a.content) }
        break
      case 'core/heading':
        attributes = {
          content: inline(a.content),
          level: [2, 3, 4].includes(Number(a.level)) ? Number(a.level) : 2,
        }
        break
      case 'core/quote':
        attributes = { citation: inline(a.citation) }
        break
      case 'core/list':
        attributes = {
          ordered: a.ordered === true,
          start:
            Number.isInteger(a.start) && Number(a.start) > 0 && Number(a.start) < 10000
              ? a.start
              : 1,
        }
        break
      case 'familie/image':
        if (!Number.isSafeInteger(a.mediaId) || Number(a.mediaId) <= 0)
          throw new Error(
            'Kies een afbeelding voor ieder afbeeldingsblok, of verwijder het lege blok.',
          )
        attributes = { mediaId: Number(a.mediaId), caption: inline(a.caption), alt: text(a.alt) }
        break
    }
    if (['left', 'center', 'right', 'justify'].includes(String(a.textAlign)))
      attributes.textAlign = a.textAlign
    return { name, attributes, innerBlocks: children.map((child) => block(child, depth + 1, name)) }
  }
  return { version: 1, blocks: value.blocks.map((raw) => block(raw, 0)) }
}
export function storyMediaIds(story: EventStory): number[] {
  const ids = new Set<number>()
  function visit(block: StoryBlock) {
    if (block.name === 'familie/image' && Number.isSafeInteger(block.attributes.mediaId))
      ids.add(Number(block.attributes.mediaId))
    block.innerBlocks.forEach(visit)
  }
  story.blocks.forEach(visit)
  return [...ids]
}
export function storyPlainText(story: EventStory): string {
  const visit = (block: StoryBlock): string =>
    [
      text(block.attributes.content),
      text(block.attributes.caption),
      text(block.attributes.citation),
      ...block.innerBlocks.map(visit),
    ]
      .filter(Boolean)
      .join(' ')
  return story.blocks.map(visit).join(' ').replace(/\s+/g, ' ').trim()
}
