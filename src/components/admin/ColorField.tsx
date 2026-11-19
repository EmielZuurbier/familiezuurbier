'use client'
import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { hexColor } from '@/lib/site-settings'

export const ColorField: TextFieldClientComponent = ({ field: config, path, readOnly }) => {
  const field = useField<string>({ path })
  const id = `field-${field.path}`
  const disabled = readOnly || field.disabled || field.formProcessing
  return (
    <div className={`field-type text${field.showError ? ' error' : ''}`}>
      <FieldLabel htmlFor={id} label={config.label} required={config.required} />
      <FieldError path={field.path} showError={field.showError} />
      <div className="admin-color-field">
        <input
          type="color"
          aria-label={`Kleurkiezer voor ${typeof config.label === 'string' ? config.label.toLowerCase() : 'deze kleur'}`}
          value={hexColor.test(field.value ?? '') ? field.value : '#000000'}
          onChange={(event) => field.setValue(event.target.value)}
          disabled={disabled}
        />
        <input
          id={id}
          type="text"
          value={field.value ?? ''}
          onChange={(event) => field.setValue(event.target.value)}
          readOnly={disabled}
          spellCheck={false}
          maxLength={7}
          aria-invalid={field.showError || undefined}
        />
      </div>
      <FieldDescription path={field.path} description={config.admin?.description} />
    </div>
  )
}
