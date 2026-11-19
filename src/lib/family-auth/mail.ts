import nodemailer from 'nodemailer'
import { APIError, type EmailAdapter } from 'payload'
import { normalizeEmail } from './primitives'
import { defaultSiteSettings, resolveSiteSettings } from '../site-settings'

export function mailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    normalizeEmail(process.env.MAIL_FROM)
  )
}
export const familyEmail: EmailAdapter = ({ payload }) => {
  const from = normalizeEmail(process.env.MAIL_FROM) || 'beheer@familieboom.invalid'
  const secure = process.env.SMTP_PORT === '465'
  const transport = mailConfigured()
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || '587'),
        secure,
        requireTLS: !secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        connectionTimeout: 10000,
        socketTimeout: 15000,
        greetingTimeout: 10000,
        logger: false,
        debug: false,
      })
    : null
  return {
    name: 'family-smtp',
    defaultFromAddress: from,
    defaultFromName: defaultSiteSettings.identity.name,
    sendEmail: async (message) => {
      if (!transport)
        throw new APIError('E-mail is nog niet ingesteld. Sluit eerst een e-maildienst aan.', 503)
      try {
        const settings = resolveSiteSettings(
          await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: false }),
        )
        return await transport.sendMail({
          ...message,
          from: { name: settings.identity.name, address: from },
        })
      } catch {
        throw new APIError(
          'De e-mail kon niet worden verstuurd. Controleer de e-mailinstellingen.',
          503,
        )
      }
    },
  }
}
