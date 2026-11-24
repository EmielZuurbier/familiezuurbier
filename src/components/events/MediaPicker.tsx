'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useConfig } from '@payloadcms/ui'
import { Button, Modal, Spinner, TextControl } from '@wordpress/components'
import type { Media } from '@/payload-types'
import { personPhoto } from '@/lib/person-photo'

export type EditorMedia = { id: number; url: string; alt: string; width: number; height: number }
export function editorMedia(doc: Media): EditorMedia | null {
  const photo = personPhoto(doc)
  return photo
    ? {
        id: doc.id,
        url: photo.url,
        alt: photo.alt || '',
        width: photo.width || 800,
        height: photo.height || 600,
      }
    : null
}
export function MediaPicker({
  multiple,
  onChoose,
  onClose,
}: {
  multiple: boolean
  onChoose: (images: EditorMedia[]) => void
  onClose: () => void
}) {
  const { config } = useConfig()
  const maxBytes = config.upload?.limits?.fileSize ?? 10 * 1024 * 1024
  const maxMB = maxBytes / (1024 * 1024)
  const [items, setItems] = useState<EditorMedia[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setBusy(true)
      setError('')
      try {
        const params = new URLSearchParams({
          depth: '0',
          limit: '24',
          page: String(page),
          sort: '-createdAt',
        })
        if (query.trim()) params.set('where[filename][like]', query.trim())
        const response = await fetch(`/api/media?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!response.ok) throw new Error()
        const data = await response.json()
        const images = data.docs.map(editorMedia).filter(Boolean) as EditorMedia[]
        if (!controller.signal.aborted) {
          setItems((current) =>
            page === 1
              ? images
              : [
                  ...current,
                  ...images.filter((item) => !current.some((old) => old.id === item.id)),
                ],
          )
          setHasMore(data.hasNextPage)
        }
      } catch {
        if (!controller.signal.aborted)
          setError('Afbeeldingen laden is niet gelukt. Sluit dit venster en probeer opnieuw.')
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [page, query])
  return (
    <Modal
      title={multiple ? 'Foto’s voor de galerij kiezen' : 'Afbeelding kiezen'}
      onRequestClose={onClose}
      className="family-media-picker"
    >
      <TextControl
        label="Zoek op bestandsnaam"
        value={query}
        onChange={(value) => {
          setQuery(value)
          setPage(1)
          setSelected([])
        }}
      />
      <label className="family-media-upload">
        Nieuwe foto’s uploaden
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={busy}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? [])
            setBusy(true)
            setError('')
            const uploaded: EditorMedia[] = []
            try {
              for (const file of files) {
                if (file.size > maxBytes)
                  throw new Error(`Een foto mag maximaal ${maxMB} MB groot zijn.`)
                const form = new FormData()
                form.append('file', file)
                form.append('_payload', JSON.stringify({ alt: '' }))
                const response = await fetch('/api/media', {
                  method: 'POST',
                  body: form,
                  credentials: 'same-origin',
                })
                if (!response.ok)
                  throw new Error(
                    `Uploaden is niet gelukt. Gebruik JPG, PNG of WebP van maximaal ${maxMB} MB.`,
                  )
                const media = editorMedia((await response.json()).doc)
                if (media) uploaded.push(media)
              }
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Uploaden is niet gelukt.')
            } finally {
              setItems((current) => [...uploaded, ...current])
              setSelected(uploaded.map((item) => item.id))
              setBusy(false)
              event.target.value = ''
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="family-media-grid">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-label={`Kies ${item.alt || `afbeelding ${item.id}`}`}
            aria-pressed={selected.includes(item.id)}
            onClick={() =>
              setSelected((current) =>
                multiple
                  ? current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id]
                  : [item.id],
              )
            }
          >
            <Image unoptimized src={item.url} width={160} height={130} alt={item.alt} />
          </button>
        ))}
      </div>
      {busy && <Spinner />}
      {!busy && !items.length && <p>Nog geen afbeeldingen gevonden. Upload hierboven een foto.</p>}
      {hasMore && (
        <Button variant="secondary" disabled={busy} onClick={() => setPage((value) => value + 1)}>
          Meer foto’s laden
        </Button>
      )}
      <div className="family-media-actions">
        <Button variant="tertiary" onClick={onClose}>
          Annuleren
        </Button>
        <Button
          variant="primary"
          disabled={busy || !selected.length}
          onClick={() =>
            onChoose(selected.flatMap((id) => items.find((item) => item.id === id) ?? []))
          }
        >
          {selected.length > 1 ? `${selected.length} foto’s invoegen` : 'Foto invoegen'}
        </Button>
      </div>
    </Modal>
  )
}
