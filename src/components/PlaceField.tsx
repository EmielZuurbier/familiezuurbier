import type { TextFieldServerComponent } from 'payload'
import { mapboxToken } from '@/lib/mapbox-token'
import { PlaceFieldClient } from './PlaceFieldClient'

export const PlaceField: TextFieldServerComponent = ({ clientField, path, readOnly }) => (
  <PlaceFieldClient
    field={clientField}
    path={path}
    readOnly={readOnly || clientField.admin?.readOnly}
    token={mapboxToken()}
  />
)
