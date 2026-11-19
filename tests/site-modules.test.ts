import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveSiteSettings } from '../src/lib/site-settings'
const mocks = vi.hoisted(() => ({
  settings: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))
vi.mock('../src/lib/get-site-settings', () => ({ getSiteSettings: mocks.settings }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, redirect: mocks.redirect }))
import { requireSiteModule } from '../src/lib/site-modules'
beforeEach(() => {
  vi.clearAllMocks()
})
describe('Modulekeuze op de server', () => {
  it('blokkeert ook een directe URL van een uitgeschakelde module', async () => {
    mocks.settings.mockResolvedValue(resolveSiteSettings({ pages: { map: { enabled: false } } }))
    await expect(requireSiteModule('map')).rejects.toThrow('not-found')
    expect(mocks.notFound).toHaveBeenCalledOnce()
  })
  it('opent de eerstvolgende actieve module als de stamboom uit staat', async () => {
    mocks.settings.mockResolvedValue(
      resolveSiteSettings({ pages: { tree: { enabled: false }, map: { enabled: false } } }),
    )
    await expect(requireSiteModule('tree')).rejects.toThrow('redirect:/verjaardagen')
    await expect(requireSiteModule('tree', '/voorbeeld')).rejects.toThrow(
      'redirect:/voorbeeld/verjaardagen',
    )
  })
  it('laat ingeschakelde modules door naar hun bestaande toegangscontrole', async () => {
    mocks.settings.mockResolvedValue(resolveSiteSettings())
    await expect(requireSiteModule('events')).resolves.toBeUndefined()
    expect(mocks.notFound).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
