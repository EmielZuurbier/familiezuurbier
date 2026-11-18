'use client'
import { FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { PlaceInput } from './PlaceInput'

export function PlaceFieldClient({
  field: config,
  path,
  readOnly,
  token,
}: TextFieldClientProps & { token: string }) {
  const field = useField<string>({ path })
  return (
    <div className={`field-type text${field.showError ? ' error' : ''}`}>
      <FieldLabel htmlFor={`field-${field.path}`} label={config.label} required={config.required} />
      <FieldError path={field.path} showError={field.showError} />
      <PlaceInput
        id={`field-${field.path}`}
        value={field.value ?? ''}
        onChange={(value) => field.setValue(value)}
        token={token}
        readOnly={readOnly || field.disabled || field.formProcessing}
        invalid={field.showError}
      />
    </div>
  )
}
