'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  BlockEditorProvider,
  BlockToolbar,
  BlockEditorKeyboardShortcuts,
  BlockList,
  BlockTools,
  InnerBlocks,
  Inserter,
  ObserveTyping,
  RichText,
  WritingFlow,
  useBlockProps,
  store as editorStore,
} from '@wordpress/block-editor'
import {
  createBlock,
  getBlockType,
  registerBlockType,
  setDefaultBlockName,
  setCategories,
  type Block,
  type BlockEditProps,
  type BlockConfiguration,
} from '@wordpress/blocks'
import { Button, SlotFillProvider, Popover, TextControl } from '@wordpress/components'
import { select, useDispatch } from '@wordpress/data'
import { store as richTextStore, unregisterFormatType } from '@wordpress/rich-text'
import { setLocaleData } from '@wordpress/i18n'
import * as paragraph from '@wordpress/block-library/build-module/paragraph/index.mjs'
import * as heading from '@wordpress/block-library/build-module/heading/index.mjs'
import * as list from '@wordpress/block-library/build-module/list/index.mjs'
import * as listItem from '@wordpress/block-library/build-module/list-item/index.mjs'
import * as quote from '@wordpress/block-library/build-module/quote/index.mjs'
import * as separator from '@wordpress/block-library/build-module/separator/index.mjs'
import { emptyStory, storyBlockNames, type EventStory, type StoryBlock } from '@/lib/events/types'
import { editorMedia, MediaPicker, type EditorMedia } from './MediaPicker'
import '@wordpress/format-library'
import '@wordpress/components/build-style/style.css'
import '@wordpress/block-editor/build-style/style.css'
import '@wordpress/block-library/build-style/style.css'
import '@wordpress/block-library/build-style/editor.css'
import './gutenberg.css'

const MediaContext = createContext<{
  assets: Record<number, EditorMedia>
  choose: (multiple: boolean, callback: (images: EditorMedia[]) => void) => void
}>({ assets: {}, choose: () => {} })
function ImageBlock({ attributes, setAttributes }: BlockEditProps<Record<string, unknown>>) {
  const { assets, choose } = useContext(MediaContext)
  const image = assets[Number(attributes.mediaId)]
  return (
    <figure {...useBlockProps({ className: 'family-editor-image' })}>
      {image ? (
        <Image
          unoptimized
          src={image.url}
          alt={String(attributes.alt || image.alt || '')}
          width={image.width}
          height={image.height}
        />
      ) : (
        <p>{attributes.mediaId ? 'Afbeelding laden…' : 'Voeg een foto aan je verhaal toe.'}</p>
      )}
      <Button
        variant="secondary"
        onClick={() =>
          choose(false, ([next]) => setAttributes({ mediaId: next.id, alt: next.alt }))
        }
      >
        {image ? 'Afbeelding vervangen' : 'Afbeelding kiezen of uploaden'}
      </Button>
      <RichText
        tagName="figcaption"
        placeholder="Bijschrift toevoegen…"
        value={String(attributes.caption || '')}
        onChange={(caption) => setAttributes({ caption })}
        allowedFormats={['core/bold', 'core/italic']}
      />
      <TextControl
        label="Beschrijving voor wie de foto niet kan zien"
        value={String(attributes.alt || '')}
        onChange={(alt) => setAttributes({ alt })}
      />
    </figure>
  )
}
function GalleryBlock({ clientId }: BlockEditProps<Record<string, unknown>>) {
  const { choose } = useContext(MediaContext)
  const { insertBlocks } = useDispatch(editorStore)
  return (
    <section {...useBlockProps({ className: 'family-editor-gallery' })}>
      <p>Fotogalerij — verplaats de afbeeldingsblokken om de volgorde te wijzigen.</p>
      <Button
        variant="secondary"
        onClick={() =>
          choose(true, (images) => {
            void insertBlocks(
              images.map((image) =>
                createBlock('familie/image', { mediaId: image.id, alt: image.alt }),
              ),
              undefined,
              clientId,
            )
          })
        }
      >
        Foto’s kiezen of uploaden
      </Button>
      <InnerBlocks
        allowedBlocks={['familie/image']}
        renderAppender={InnerBlocks.ButtonBlockAppender}
      />
    </section>
  )
}
function registerBlocks() {
  const allowedFormats = [
    'core/bold',
    'core/italic',
    'core/link',
    'core/strikethrough',
    'core/underline',
    'core/code',
    'core/subscript',
    'core/superscript',
  ]
  for (const format of select(richTextStore).getFormatTypes()) {
    if (!allowedFormats.includes(format.name)) unregisterFormatType(format.name)
  }
  setLocaleData({
    '': { domain: 'default', lang: 'nl', plural_forms: 'nplurals=2; plural=(n != 1);' },
    'Add block': ['Blok toevoegen'],
    'Close Block Inserter': ['Blokkiezer sluiten'],
    Blocks: ['Blokken'],
    Patterns: ['Patronen'],
    Media: ['Media'],
    Search: ['Zoeken'],
    Paragraph: ['Alinea'],
    Heading: ['Tussenkop'],
    Quote: ['Citaat'],
    Close: ['Sluiten'],
    'Editor canvas': ['Verhaleneditor'],
    'Quote citation': ['Naam bij het citaat'],
    'Move up': ['Omhoog verplaatsen'],
    'Move down': ['Omlaag verplaatsen'],
    Bold: ['Vet'],
    Italic: ['Cursief'],
    Link: ['Link'],
    More: ['Meer'],
    Options: ['Opties'],
  })
  setDefaultBlockName('core/paragraph')
  setCategories([
    { slug: 'text', title: 'Tekst' },
    { slug: 'media', title: 'Foto’s' },
  ])
  const definitions = [
    [paragraph, 'Alinea'],
    [heading, 'Tussenkop'],
    [list, 'Lijst'],
    [listItem, 'Lijstitem'],
    [quote, 'Citaat'],
    [separator, 'Scheidingslijn'],
  ] as const
  for (const [definition, title] of definitions) {
    const name = String(definition.metadata.name)
    if (!getBlockType(name))
      registerBlockType(name, {
        ...definition.metadata,
        ...definition.settings,
        title,
        supports: {
          ...(definition.metadata.supports as object),
          html: false,
          customClassName: false,
          color: false,
          typography: false,
          spacing: false,
          __experimentalBorder: false,
          anchor: false,
          align: false,
          background: false,
          shadow: false,
        },
        ...(name === 'core/heading'
          ? {
              attributes: {
                ...(definition.metadata.attributes as object),
                level: { type: 'number', default: 2 },
                levelOptions: { type: 'array', default: [2, 3, 4] },
              },
            }
          : {}),
      } as unknown as BlockConfiguration)
  }
  if (!getBlockType('familie/image'))
    registerBlockType('familie/image', {
      apiVersion: 3,
      title: 'Afbeelding',
      category: 'media',
      icon: 'format-image',
      attributes: {
        mediaId: { type: 'number' },
        caption: { type: 'string', default: '' },
        alt: { type: 'string', default: '' },
      },
      supports: { html: false, customClassName: false },
      edit: ImageBlock,
      save: () => null,
    })
  if (!getBlockType('familie/gallery'))
    registerBlockType('familie/gallery', {
      apiVersion: 3,
      title: 'Fotogalerij',
      category: 'media',
      icon: 'format-gallery',
      attributes: {},
      supports: { html: false, customClassName: false },
      edit: GalleryBlock,
      save: () => <InnerBlocks.Content />,
    })
}
registerBlocks()
const restore = (block: StoryBlock): Block =>
  createBlock(block.name, block.attributes, block.innerBlocks.map(restore))
const storeBlocks = (blocks: Block[]): StoryBlock[] =>
  blocks.map((block) => ({
    name: block.name,
    attributes: JSON.parse(JSON.stringify(block.attributes)),
    innerBlocks: storeBlocks(block.innerBlocks),
  }))

export default function GutenbergEditor({
  value,
  onChange,
  readOnly,
}: {
  value: EventStory
  onChange: (value: EventStory) => void
  readOnly?: boolean
}) {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    (value?.blocks ?? emptyStory.blocks).map(restore),
  )
  const [assets, setAssets] = useState<Record<number, EditorMedia>>({})
  const [picker, setPicker] = useState<{
    multiple: boolean
    callback: (images: EditorMedia[]) => void
  } | null>(null)
  const history = useRef<{ past: Block[][]; future: Block[][]; latest: Block[] }>({
    past: [],
    future: [],
    latest: blocks,
  })
  const [historyState, setHistoryState] = useState({ undo: false, redo: false })
  const [error, setError] = useState('')
  const undoGroup = useRef({ block: '', time: 0 })
  const last = useRef(JSON.stringify(storeBlocks(blocks)))
  const persist = useCallback(
    (next: Block[]) => {
      const stored = storeBlocks(next)
      const encoded = JSON.stringify(stored)
      if (encoded === last.current) return
      last.current = encoded
      const changed =
        next.find(
          (block, index) => JSON.stringify(block) !== JSON.stringify(history.current.latest[index]),
        )?.clientId || ''
      const now = Date.now()
      if (
        !changed ||
        changed !== undoGroup.current.block ||
        now - undoGroup.current.time > 900 ||
        next.length !== history.current.latest.length
      ) {
        history.current.past = [...history.current.past.slice(-39), history.current.latest]
      }
      undoGroup.current = { block: changed, time: now }
      history.current.future = []
      setHistoryState({ undo: true, redo: false })
      history.current.latest = next
      setBlocks(next)
      onChange({ version: 1, blocks: stored })
    },
    [onChange],
  )
  useEffect(() => {
    const ids = new Set<number>()
    const visit = (block: Block) => {
      if (block.name === 'familie/image' && block.attributes.mediaId)
        ids.add(Number(block.attributes.mediaId))
      block.innerBlocks.forEach(visit)
    }
    blocks.forEach(visit)
    const missing = [...ids].filter((id) => !assets[id])
    if (!missing.length) return
    const controller = new AbortController()
    void fetch(`/api/media?depth=0&limit=${missing.length}&where[id][in]=${missing.join(',')}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then((data) => {
        const received = data.docs.map(editorMedia).filter(Boolean) as EditorMedia[]
        if (!received.length) throw new Error('Afbeelding ontbreekt')
        if (!controller.signal.aborted)
          setAssets((current) => ({
            ...current,
            ...Object.fromEntries(received.map((item) => [item.id, item])),
          }))
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'Een afbeelding kon niet worden geladen. Heropen het verhaal om opnieuw te proberen.',
          )
      })
    return () => controller.abort()
  }, [blocks, assets])
  const choose = useCallback(
    (multiple: boolean, callback: (images: EditorMedia[]) => void) =>
      setPicker({ multiple, callback }),
    [],
  )
  const travel = (direction: 'past' | 'future') => {
    const h = history.current,
      source = h[direction],
      next = source.at(-1)
    if (!next) return
    h[direction] = source.slice(0, -1)
    const target = direction === 'past' ? 'future' : 'past'
    h[target] = [...h[target], h.latest]
    h.latest = next
    undoGroup.current = { block: '', time: 0 }
    setHistoryState({ undo: h.past.length > 0, redo: h.future.length > 0 })
    last.current = JSON.stringify(storeBlocks(next))
    setBlocks(next)
    onChange({ version: 1, blocks: storeBlocks(next) })
  }
  return (
    <div className="gutenberg-editor" inert={readOnly || undefined}>
      <SlotFillProvider>
        <MediaContext.Provider value={{ assets, choose }}>
          <BlockEditorProvider
            value={blocks}
            onInput={persist}
            onChange={persist}
            settings={{
              allowedBlockTypes: storyBlockNames,
              hasFixedToolbar: true,
              isPreviewMode: readOnly,
              enableOpenverseMediaCategory: false,
              canUserUseUnfilteredHTML: false,
              __experimentalBlockPatterns: [],
            }}
          >
            <BlockEditorKeyboardShortcuts.Register />
            <div className="family-editor-toolbar">
              <Inserter />
              <BlockToolbar />
              <Button
                variant="tertiary"
                disabled={!historyState.undo}
                onClick={() => travel('past')}
              >
                Ongedaan maken
              </Button>
              <Button
                variant="tertiary"
                disabled={!historyState.redo}
                onClick={() => travel('future')}
              >
                Opnieuw
              </Button>
            </div>
            <BlockTools>
              <div className="editor-styles-wrapper">
                <WritingFlow>
                  <ObserveTyping>
                    <BlockList />
                  </ObserveTyping>
                </WritingFlow>
              </div>
            </BlockTools>
            <Popover.Slot />
          </BlockEditorProvider>
          {error && <p role="alert">{error}</p>}
          {picker && (
            <MediaPicker
              multiple={picker.multiple}
              onClose={() => setPicker(null)}
              onChoose={(images) => {
                setAssets((current) => ({
                  ...current,
                  ...Object.fromEntries(images.map((image) => [image.id, image])),
                }))
                picker.callback(images)
                setPicker(null)
              }}
            />
          )}
        </MediaContext.Provider>
      </SlotFillProvider>
    </div>
  )
}
