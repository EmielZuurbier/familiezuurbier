import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
const mocks = vi.hoisted(() => ({ send: vi.fn(), transport: vi.fn(), settings: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.transport } }))
import { familyEmail } from '../src/lib/family-auth/mail'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SMTP_HOST', 'smtp.example.test')
  vi.stubEnv('SMTP_USER', 'fictieve-gebruiker')
  vi.stubEnv('SMTP_PASSWORD', 'fictief-testwachtwoord')
  vi.stubEnv('MAIL_FROM', 'beheer@example.test')
  mocks.transport.mockReturnValue({ sendMail: mocks.send })
  mocks.settings.mockResolvedValue({ identity: { name: 'Familie Testhuis' } })
})
afterEach(() => vi.unstubAllEnvs())
const adapter = () => familyEmail({ payload: { findGlobal: mocks.settings } as unknown as Payload })

describe('E-mail met de ingestelde huisstijl', () => {
  it('gebruikt de actuele websitenaam met het ingestelde afzenderadres', async () => {
    await adapter().sendEmail({
      to: 'familie@example.test',
      subject: 'Proef',
      text: 'Fictieve proef',
      from: 'Oude naam <oud@example.test>',
    })
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { name: 'Familie Testhuis', address: 'beheer@example.test' },
        to: 'familie@example.test',
        subject: 'Proef',
        text: 'Fictieve proef',
      }),
    )
    expect(mocks.settings).toHaveBeenCalledWith({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: false,
    })
  })
  it('leest een naamswijziging opnieuw zonder de maildienst opnieuw te starten', async () => {
    const mail = adapter()
    await mail.sendEmail({ to: 'familie@example.test', text: 'Fictieve proef' })
    mocks.settings.mockResolvedValue({ identity: { name: 'Familie Nieuwenaam' } })
    await mail.sendEmail({ to: 'familie@example.test', text: 'Nog een fictieve proef' })
    expect(mocks.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: { name: 'Familie Nieuwenaam', address: 'beheer@example.test' },
      }),
    )
  })
  it('verstuurt niets wanneer de maildienst nog niet is ingesteld', async () => {
    vi.stubEnv('SMTP_PASSWORD', '')
    await expect(
      adapter().sendEmail({ to: 'familie@example.test', text: 'Fictieve proef' }),
    ).rejects.toThrow('E-mail is nog niet ingesteld')
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
