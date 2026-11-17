import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'
import { databaseConfigured } from '@/lib/settings'
const unavailable = () =>
  Response.json({ errors: [{ message: 'Beheer is nog niet ingesteld.' }] }, { status: 503 })
function guard<T extends (...args: never[]) => unknown>(handler: T): T {
  return ((...args: Parameters<T>) =>
    databaseConfigured() ? handler(...args) : unavailable()) as T
}
export const GET = guard(REST_GET(config))
export const POST = guard(REST_POST(config))
export const DELETE = guard(REST_DELETE(config))
export const PATCH = guard(REST_PATCH(config))
export const PUT = guard(REST_PUT(config))
export const OPTIONS = guard(REST_OPTIONS(config))
