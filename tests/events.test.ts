import { describe, expect, it } from 'vitest'
import { normalizeStory, storyMediaIds, storyPlainText } from '../src/lib/events/story'
import { eventOrder, eventsForPerson, eventHref } from '../src/lib/events/timeline'
import { Events } from '../src/collections/events'
import { demoEvents } from '../src/lib/demo-events'
const block = (name: string, attributes = {}, innerBlocks: unknown[] = []) => ({
  name,
  attributes,
  innerBlocks,
})
const story = (blocks: unknown[]) => ({ version: 1, blocks })

describe('Verhalen veilig en bewerkbaar bewaren', () => {
  it('bewaart blokvolgorde, opmaak, afbeeldingskoppelingen en bijschriften', () => {
    const value = story([
      block('core/heading', { level: 3, content: 'Een <em>verhaal</em>' }),
      block('core/paragraph', { content: 'Een <strong>mooie</strong> dag.' }),
      block('familie/gallery', {}, [
        block('familie/image', { mediaId: 12, caption: 'Samen aan tafel', alt: 'Familiefoto' }),
        block('familie/image', { mediaId: 13 }),
      ]),
      block('core/quote', { citation: 'Oma' }, [
        block('core/paragraph', { content: 'Wat gezellig.' }),
      ]),
      block('core/list', { ordered: true, start: 2 }, [
        block('core/list-item', { content: 'Taart' }),
      ]),
    ])
    const saved = normalizeStory(value)
    expect(normalizeStory(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
    expect(storyMediaIds(saved)).toEqual([12, 13])
    expect(saved.blocks[0].attributes.level).toBe(3)
    expect(storyPlainText(saved)).toContain(
      'Een verhaal Een mooie dag. Samen aan tafel Oma Wat gezellig. Taart',
    )
  })
  it('verwijdert scripts, onveilige links, HTML-attributen en losse afbeeldings-URL’s', () => {
    const saved = normalizeStory(
      story([
        block('core/paragraph', {
          content:
            '<script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)" onclick="bad()">link</a><strong style="color:red">tekst</strong>',
        }),
        block('familie/image', {
          mediaId: 12,
          url: 'https://onbekend.example/privaat.jpg',
          caption: '<iframe src="x"></iframe>Bijschrift',
          alt: '<b>Beschrijving</b>',
        }),
      ]),
    )
    const content = JSON.stringify(saved)
    for (const unsafe of [
      '<script',
      '<img',
      'javascript:',
      'onclick',
      '<iframe',
      'style=',
      'onbekend.example',
    ])
      expect(content).not.toContain(unsafe)
    expect(saved.blocks[1].attributes.alt).toBe('Beschrijving')
  })
  it('behoudt gewone veilige links maar geen relatieve protocollen', () => {
    const saved = normalizeStory(
      story([
        block('core/paragraph', {
          content: '<a href="https://example.org">bron</a> <a href="//evil.example">weg</a>',
        }),
      ]),
    )
    expect(saved.blocks[0].attributes.content).toContain('href="https://example.org"')
    expect(saved.blocks[0].attributes.content).not.toContain('//evil.example')
  })
  it('weigert onbekende blokken en versies in plaats van inhoud stil te verliezen', () => {
    expect(() => normalizeStory({ version: 2, blocks: [] })).toThrow('onbekend opslagformaat')
    expect(() => normalizeStory(story([block('core/html')]))).toThrow('niet ondersteund')
    expect(() => normalizeStory(story([block('core/list-item')]))).toThrow('binnen een lijst')
    expect(() =>
      normalizeStory(story([block('familie/gallery', {}, [block('core/paragraph')])])),
    ).toThrow('alleen afbeeldingen')
    expect(() => normalizeStory(story([block('familie/image', { mediaId: -1 })]))).toThrow(
      'Kies een afbeelding',
    )
  })
  it('begrenst het aantal, formaat en de diepte van blokken', () => {
    expect(() =>
      normalizeStory(story(Array.from({ length: 301 }, () => block('core/paragraph')))),
    ).toThrow('te veel')
    expect(() =>
      normalizeStory(story([block('core/paragraph', { content: 'x'.repeat(760000) })])),
    ).toThrow('te groot')
    let nested = block('core/paragraph')
    for (let i = 0; i < 15; i++) nested = block('core/quote', {}, [nested])
    expect(() => normalizeStory(story([nested]))).toThrow('te diep')
  })
  it('ontdubbelt afbeeldingsverwijzingen en accepteert een leeg verhaal', () => {
    const saved = normalizeStory(
      story([
        block('familie/image', { mediaId: 2 }),
        block('familie/gallery', {}, [block('familie/image', { mediaId: 2 })]),
      ]),
    )
    expect(storyMediaIds(saved)).toEqual([2])
    expect(normalizeStory(null)).toEqual(story([]))
  })
})

describe('Gebeurtenissen en betrokken personen', () => {
  it('sorteert nieuwe gebeurtenissen eerst en ongedateerde verhalen onderaan', () => {
    const events = [
      ...demoEvents,
      { ...demoEvents[0], id: 'earlier', date: { year: 2026, month: 1 } },
    ].sort(eventOrder)
    expect(events.map((event) => event.id)).toEqual([
      'voorbeeld-familiedag',
      'earlier',
      'voorbeeld-verhuizing',
      'voorbeeld-onbekend',
    ])
    expect(eventsForPerson(demoEvents, '3').map((event) => event.id)).toEqual([
      'voorbeeld-familiedag',
      'voorbeeld-onbekend',
    ])
    expect(eventsForPerson(demoEvents, 'nobody')).toEqual([])
    expect(eventsForPerson(undefined, '1')).toEqual([])
    expect(eventHref('/voorbeeld', '1 & 2')).toBe('/voorbeeld/gebeurtenissen?event=1%20%26%202')
  })
  it('valideert titel en echte maar eventueel onvolledige datums', () => {
    const validate = Events.hooks!.beforeValidate![0]
    const check = (data: Record<string, unknown>) =>
      validate({ data } as Parameters<typeof validate>[0])
    expect(check({ title: '  Nieuw thuis  ', date: { year: 1982 } })).toMatchObject({
      title: 'Nieuw thuis',
    })
    expect(() => check({ title: ' ' })).toThrow('een titel')
    expect(() => check({ title: 'Test', date: { year: 2025, month: 2, day: 29 } })).toThrow(
      'bestaat niet',
    )
  })
})
