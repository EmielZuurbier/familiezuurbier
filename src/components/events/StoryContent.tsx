import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { FamilyEvent, StoryBlock } from '@/lib/events/types'

// Only normalized, allowlisted story data from the authenticated loader reaches
// this renderer. HTML is limited to sanitized inline text, never full blocks.
export function StoryContent({ event }: { event: FamilyEvent }) {
  const rich = (value: unknown) => ({ __html: typeof value === 'string' ? value : '' })
  const render = (block: StoryBlock, index: number) => {
    const a = block.attributes,
      children = block.innerBlocks.map(render)
    const alignment = a.textAlign as CSSProperties['textAlign']
    switch (block.name) {
      case 'core/paragraph':
        return (
          <p
            key={index}
            style={{ textAlign: alignment }}
            dangerouslySetInnerHTML={rich(a.content)}
          />
        )
      case 'core/heading': {
        const Heading = Number(a.level) === 3 ? 'h3' : Number(a.level) === 4 ? 'h4' : 'h2'
        return (
          <Heading
            key={index}
            style={{ textAlign: alignment }}
            dangerouslySetInnerHTML={rich(a.content)}
          />
        )
      }
      case 'core/quote':
        return (
          <blockquote key={index} style={{ textAlign: alignment }}>
            {children}
            {!!a.citation && <cite dangerouslySetInnerHTML={rich(a.citation)} />}
          </blockquote>
        )
      case 'core/list':
        return a.ordered ? (
          <ol key={index} start={Number(a.start) || 1}>
            {children}
          </ol>
        ) : (
          <ul key={index}>{children}</ul>
        )
      case 'core/list-item':
        return (
          <li key={index}>
            <span dangerouslySetInnerHTML={rich(a.content)} />
            {children}
          </li>
        )
      case 'core/separator':
        return <hr key={index} />
      case 'familie/gallery':
        return (
          <div className="event-gallery" key={index}>
            {children}
          </div>
        )
      case 'familie/image': {
        const image = event.images[String(a.mediaId)]
        return image ? (
          <figure key={index}>
            <Image
              unoptimized
              src={image.url}
              width={image.width || 1000}
              height={image.height || 750}
              alt={String(a.alt || image.alt || '')}
            />
            {!!a.caption && <figcaption dangerouslySetInnerHTML={rich(a.caption)} />}
          </figure>
        ) : (
          <p key={index} className="unknown-note">
            Deze afbeelding is niet meer beschikbaar.
          </p>
        )
      }
      default:
        return null
    }
  }
  return <div className="event-story">{event.story.blocks.map(render)}</div>
}
