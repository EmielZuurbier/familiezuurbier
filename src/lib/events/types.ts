import type { PartialDate, PersonPhoto } from '../types'

export type StoryBlock = {
  name: string
  attributes: Record<string, unknown>
  innerBlocks: StoryBlock[]
}
export type EventStory = { version: 1; blocks: StoryBlock[] }
export type FamilyEvent = {
  id: string
  title: string
  date: PartialDate
  place?: string | null
  excerpt: string
  story: EventStory
  people: string[]
  cover?: PersonPhoto
  images: Record<string, PersonPhoto>
}
export const storyBlockNames = [
  'core/paragraph',
  'core/heading',
  'core/list',
  'core/list-item',
  'core/quote',
  'core/separator',
  'familie/image',
  'familie/gallery',
]
export const emptyStory: EventStory = { version: 1, blocks: [] }
