import nodemailer from 'nodemailer'
import { APIError, type EmailAdapter } from 'payload'
import { normalizeEmail } from './primitives'
import { familyBrand } from '../branding'

export function mailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    normalizeEmail(process.env.MAIL_FROM)
  )
}
export const familyEmail: EmailAdapter = () => {
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
    defaultFromName: familyBrand.name,
    sendEmail: async (message) => {
      if (!transport)
        throw new APIError('E-mail is nog niet ingesteld. Sluit eerst een e-maildienst aan.', 503)
      try {
        return await transport.sendMail({
          from: { name: familyBrand.name, address: from },
          ...message,
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
