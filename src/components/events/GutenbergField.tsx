'use client'
import dynamic from 'next/dynamic'
import { FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { emptyStory, type EventStory } from '@/lib/events/types'
const Editor = dynamic(() => import('./GutenbergEditor'), {
  ssr: false,
  loading: () => <p>Verhaleneditor laden…</p>,
})
export const GutenbergField: JSONFieldClientComponent = ({ path, field: config, readOnly }) => {
  const field = useField<EventStory>({ path })
  return (
    <div className="field-type json">
      <FieldLabel label={config.label} path={path} />
      <FieldError path={field.path} showError={field.showError} />
      <p>Schrijf je verhaal. Met + voeg je tekst, afbeeldingen, een galerij of een citaat toe.</p>
      <Editor
        value={field.value ?? emptyStory}
        onChange={field.setValue}
        readOnly={readOnly || field.disabled || field.formProcessing}
      />
    </div>
  )
}
