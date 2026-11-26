import { describe, expect, it } from 'vitest'
import { invitationEmail, loginCodeEmail } from '../src/lib/family-auth/email-templates'
import { resolveSiteSettings } from '../src/lib/site-settings'

const origin = 'https://familie.example.test'
const invitationURL = `${origin}/inloggen#uitnodiging=fictief-token`
const settings = resolveSiteSettings()

describe('Opgemaakte familie-e-mails', () => {
  it('houdt de uitnodigingslink en geldigheid in de HTML en tekstversie gelijk', () => {
    const mail = invitationEmail({ settings, origin, name: 'Fictief familielid', invitationURL })
    expect(mail.html).toContain(`href="${invitationURL}"`)
    expect(mail.text).toContain(invitationURL)
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain('zeven dagen')
      expect(body).toContain('kijkrechten')
      expect(body).toContain('Fictief familielid')
    }
    expect(mail.html).toContain('Accepteer de uitnodiging')
  })

  it('behoudt een code met voorloopnullen en vermeldt de juiste geldigheid', () => {
    const mail = loginCodeEmail({ settings, origin, code: '012345' })
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain('012345')
      expect(body).toContain('tien minuten')
      expect(body).toContain('één keer')
      expect(body).toContain('Deel de code niet')
    }
    expect(mail.subject).not.toContain('012345')
    expect(mail.html.match(/<div[^>]*>(.*?)<\/div>/s)?.[1]).not.toContain('012345')
  })

  it('neemt actuele CMS-kleuren, lettertypekeuzes, logo en mailteksten over', () => {
    const custom = resolveSiteSettings({
      identity: {
        name: 'Familie Testhuis',
        surname: 'Testhuis',
        wordmark: 'onze familie',
        showDot: false,
        logo: { filename: 'familie logo.webp' },
      },
      appearance: { green: '#123456', paper: '#faf0e0', headingFont: 'dm-sans' },
      mail: {
        invitationSubject: 'Welkom bij {familienaam}',
        invitationIntroduction: 'Ontdek {websitenaam}.\nMet elkaar verbonden.',
        codeSubject: 'Inloggen bij {familienaam}',
      },
    })
    const mail = invitationEmail({ settings: custom, origin, name: 'Test', invitationURL })
    expect(mail.subject).toBe('Welkom bij Testhuis')
    expect(mail.html).toContain('Familie Testhuis')
    expect(mail.html).toContain('onze familie')
    expect(mail.html).toContain('Ontdek Familie Testhuis.<br>Met elkaar verbonden.')
    expect(mail.html).toContain('#123456')
    expect(mail.html).toContain('#faf0e0')
    expect(mail.html).toContain(`src="${origin}/api/brand-assets/file/familie%20logo.webp"`)
    expect(mail.html).toMatch(/<h1[^>]*font-family:Arial, Helvetica, sans-serif/)
    expect(loginCodeEmail({ settings: custom, origin, code: '123456' }).subject).toBe(
      'Inloggen bij Testhuis',
    )
  })

  it('behandelt namen en CMS-teksten als tekst, ook in attributen', () => {
    const custom = resolveSiteSettings({
      identity: { name: '<Familie "Test">', wordmark: '<img src=x onerror=alert(1)>' },
      mail: { invitationIntroduction: '<script>alert(1)</script> & welkom' },
    })
    const mail = invitationEmail({
      settings: custom,
      origin,
      name: '<b>Test & "familie"</b>',
      invitationURL: `${invitationURL}&naam="test"`,
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).not.toContain('<img src=x')
    expect(mail.html).not.toContain('<b>Test')
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; welkom')
    expect(mail.html).toContain('&lt;b&gt;Test &amp; &quot;familie&quot;&lt;/b&gt;')
    expect(mail.html).toContain('&amp;naam=&quot;test&quot;')
    expect(mail.text).toContain('<script>alert(1)</script> & welkom')
  })

  it('blijft zelfstandig leesbaar zonder webfonts, scripts of meetpixels', () => {
    const mail = loginCodeEmail({ settings, origin, code: '123456' })
    expect(mail.html).toContain('lang="nl"')
    expect(mail.html).toContain('role="presentation"')
    expect(mail.html).toContain(`src="${origin}/email/family-branch.png"`)
    expect(mail.html).toContain('Familie Zuurbier')
    expect(mail.html).not.toMatch(
      /<script|<svg|<iframe|<link|@import|fonts\.google|googletagmanager/i,
    )
  })
})
