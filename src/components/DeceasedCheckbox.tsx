'use client'
import { CheckboxInput, FieldDescription, FieldError, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import type { Person } from '@/lib/types'

// Keep the existing stored values compatible while exposing just one decision
// in the CMS. Unchecked never creates a new confirmation that someone is alive.
export const DeceasedCheckbox: SelectFieldClientComponent = ({ path, readOnly }) => {
  const field = useField<Person['lifeStatus']>({ path })
  return (
    <div className={`field-type checkbox${field.showError ? ' error' : ''}`}>
      <FieldError path={field.path} showError={field.showError} />
      <CheckboxInput
        id={`field-${field.path}`}
        name={field.path}
        label="Overleden"
        checked={field.value === 'deceased'}
        readOnly={readOnly || field.disabled || field.formProcessing}
        onToggle={(event) =>
          field.setValue(
            event.target.checked
              ? 'deceased'
              : field.initialValue === 'living'
                ? 'living'
                : 'unknown',
          )
        }
      />
      <FieldDescription
        path={field.path}
        description="Vink alleen aan wanneer bekend is dat deze persoon is overleden. Datum en plaats van overlijden mogen onbekend blijven."
      />
    </div>
  )
}

export function DeceasedCell({ cellData }: { cellData?: unknown }) {
  return <span>{cellData === 'deceased' ? 'Ja' : '—'}</span>
}
