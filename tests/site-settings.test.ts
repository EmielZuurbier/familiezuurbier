import { describe, expect, it } from 'vitest'
import {
  defaultSiteSettings,
  firstModulePath,
  resolveSiteSettings,
  siteText,
  siteVariables,
} from '../src/lib/site-settings'

describe('Website-instellingen', () => {
  it('behoudt de huidige huisstijl en teksten zonder opgeslagen instellingen', () => {
    const settings = resolveSiteSettings()
    expect(settings).toEqual({ ...defaultSiteSettings, logo: null, icon: null })
    expect(siteText(settings.pages.tree.titleAccent, settings)).toBe('Zuurbier.')
    expect(settings.options.defaultTreeStyle).toBe('structured')
  })
  it('vult ontbrekende onderdelen aan zonder bewuste lege teksten of uitgeschakelde functies te overschrijven', () => {
    const settings = resolveSiteSettings({
      identity: { surname: 'Testhuis', description: '' },
      pages: { map: { enabled: false } },
      options: { minimap: false },
    })
    expect(settings.pages.map.enabled).toBe(false)
    expect(settings.pages.calendar.enabled).toBe(true)
    expect(settings.options.minimap).toBe(false)
    expect(settings.identity.description).toBe('')
    expect(siteText(settings.login.title, settings)).toBe('Welkom bij de familie Testhuis.')
    expect(defaultSiteSettings.identity.surname).toBe('Zuurbier')
  })
  it('vervangt bekende invulcodes één keer en behandelt namen als gewone tekst', () => {
    const settings = resolveSiteSettings({
      identity: { surname: '{websitenaam}', name: '<Testhuis>' },
    })
    expect(
      siteText('{familienaam} · {websitenaam} · {email} · {onbekend}', settings, {
        email: 'persoon@example.test',
      }),
    ).toBe('{websitenaam} · <Testhuis> · persoon@example.test · {onbekend}')
  })
  it('geeft alleen bekende configuratie door en weigert onveilige stijl- en meetwaarden', () => {
    const settings = resolveSiteSettings({
      SMTP_PASSWORD: 'nooit-doorgeven',
      appearance: { green: 'red;display:none', bodyFont: 'url(https://invalid.test)' },
      tracking: { containerId: "GTM-';alert(1)//" },
    })
    expect(settings).not.toHaveProperty('SMTP_PASSWORD')
    expect(settings.appearance.green).toBe('#345d49')
    expect(settings.tracking.containerId).toBe('')
    expect(siteVariables(settings)['--sans']).toContain('DM Sans')
  })
  it('gebruikt voor logo’s uitsluitend de eigen openbare huisstijlcollectie', () => {
    expect(
      resolveSiteSettings({
        identity: { logo: { filename: 'logo met spatie.webp', url: 'https://invalid.test/a' } },
      }).logo,
    ).toBe('/api/brand-assets/file/logo%20met%20spatie.webp')
    for (const filename of ['../prive.webp', 'map\\prive.webp', 'fout\u0000.webp'])
      expect(resolveSiteSettings({ identity: { logo: { filename } } }).logo).toBeNull()
    expect(resolveSiteSettings({ identity: { logo: 12 } }).logo).toBeNull()
  })
  it('kiest de eerste actieve module als startpagina en voorkomt een onbruikbare lege website', () => {
    const settings = resolveSiteSettings({
      pages: { tree: { enabled: false }, map: { enabled: false } },
    })
    expect(firstModulePath(settings)).toBe('/verjaardagen')
    expect(firstModulePath(settings, '/voorbeeld')).toBe('/voorbeeld/verjaardagen')
    const empty = resolveSiteSettings({
      pages: Object.fromEntries(
        ['tree', 'map', 'calendar', 'events'].map((key) => [key, { enabled: false }]),
      ),
    })
    expect(firstModulePath(empty)).toBe('/')
  })
})
