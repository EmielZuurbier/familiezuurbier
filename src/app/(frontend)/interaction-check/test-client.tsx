'use client'
// Development-only checks against the real rendered tree; no family records are changed.
import { useRef, useState } from 'react'
import { MOUSE_AMPLITUDES } from '@/lib/pan'
export function InteractionCheck({ source = '/' }: { source?: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [result, setResult] = useState('Nog niet uitgevoerd')
  const [running, setRunning] = useState(false)
  async function run(style: 'structured' | 'organic') {
    const doc = frame.current?.contentDocument
    const canvas = doc?.querySelector<HTMLElement>('[data-testid="tree-canvas"]')
    if (!doc || !canvas) {
      setResult('Log eerst lokaal in bij /admin.')
      return
    }
    const nextFrame = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
    const settle = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 450))
      await nextFrame()
    }
    const assert = (value: boolean, message: string) => {
      if (!value) throw new Error(message)
    }
    const viewport = () => doc.querySelector<HTMLElement>('.react-flow__viewport')!
    const camera = () => getComputedStyle(viewport()).transform
    const offset = () => getComputedStyle(viewport()).translate.split(' ').map(parseFloat)
    const pointer = (x: number, y: number, buttons = 0, pointerType = 'mouse') => {
      const rect = canvas.getBoundingClientRect()
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: rect.left + x,
          clientY: rect.top + y,
          pointerType,
          buttons,
        }),
      )
    }
    const reset = () =>
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, buttons: 1, pointerType: 'mouse' }),
      )
    const key = async (value: string, target: HTMLElement = canvas) => {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
      )
      await settle()
    }
    try {
      setRunning(true)
      setResult('Controle wordt uitgevoerd…')
      doc.querySelector<HTMLButtonElement>('[aria-label="Persoonsgegevens sluiten"]')?.click()
      doc
        .querySelectorAll<HTMLButtonElement>('.tree-style-toggle button')
        [style === 'organic' ? 1 : 0]?.click()
      await settle()
      doc.querySelector<HTMLButtonElement>('[aria-label="Muisbeweging hervatten"]')?.click()
      await nextFrame()
      const rect = canvas.getBoundingClientRect(),
        x = rect.width / 2,
        y = rect.height / 2
      const strength = doc.querySelector<HTMLSelectElement>(
        '[aria-label="Sterkte van muisbeweging"]',
      )!
      const initial = camera()
      for (const amplitude of Object.values(MOUSE_AMPLITUDES)) {
        strength.value = String(amplitude)
        strength.dispatchEvent(new Event('change', { bubbles: true }))
        await nextFrame()
        reset()
        pointer(x, y)
        await nextFrame()
        for (let sweep = 0; sweep < 8; sweep++) {
          pointer(rect.width - 1, rect.height - 1)
          await nextFrame()
          const [dx, dy] = offset()
          assert(
            Math.abs(dx) <= amplitude && Math.abs(dy) <= amplitude,
            'Muisaccent overschrijdt de ingestelde schermpixels',
          )
          assert(camera() === initial, 'Muisbeweging heeft de navigatiecamera verplaatst')
          pointer(1, 1)
          await nextFrame()
        }
        pointer(x, y)
        await nextFrame()
        assert(
          offset().every((value) => Math.abs(value) < 0.01),
          'Muisaccent keert niet terug naar het beginpunt',
        )
      }
      reset()
      await nextFrame()
      canvas.focus()
      const beforeKey = camera()
      await key('ArrowRight')
      assert(camera() !== beforeKey, 'Pijltjestoets verplaatst het veld niet')
      const moved = camera()
      await settle()
      assert(camera() === moved, 'Camera springt terug na toetsenbordbeweging')
      await key('Enter')
      const chosen = () =>
        doc.querySelector<HTMLButtonElement>('.person-button[aria-pressed="true"]')
      assert(!!chosen(), 'Enter selecteert geen persoon')
      assert(doc.activeElement === chosen(), 'Toetsenbordfocus volgt de geselecteerde kaart niet')
      const paused = camera()
      pointer(1, 1)
      pointer(rect.width - 1, rect.height - 1)
      await nextFrame()
      assert(
        camera() === paused && offset().every((value) => value === 0),
        'Selectie pauzeert het muisaccent niet',
      )
      for (const [heading, direction] of [
        ['Kinderen', 'ArrowDown'],
        ['Ouders', 'ArrowUp'],
      ] as const) {
        const section = [
          ...doc.querySelectorAll<HTMLElement>('.detail-panel .relatives-section'),
        ].find((section) => section.querySelector('h3')?.textContent?.includes(heading))
        const names = [...(section?.querySelectorAll('.relative strong') ?? [])].map(
          (node) => node.textContent,
        )
        if (names.length) {
          await key(direction, chosen()!)
          assert(
            names.includes(chosen()?.querySelector('strong')?.textContent ?? ''),
            'Pijltjestoets volgt de familieband niet',
          )
        }
      }
      const search = doc.querySelector<HTMLInputElement>('#person-search')!
      search.focus()
      const beforeInput = camera()
      await key('ArrowLeft', search)
      assert(camera() === beforeInput, 'Pijltjestoets in het zoekveld verplaatst de stamboom')
      await key('Escape', chosen()!)
      assert(
        !chosen() && doc.activeElement === canvas,
        'Escape geeft de focus niet terug aan het veld',
      )
      setResult(
        `GESLAAGD (${style}): drie begrensde muisaccenten zonder cameradrift, toetsenbordverplaatsing, Enter, ouder/kind, selectie pauzeert, focusbehoud, zoekveld en Escape.`,
      )
    } catch (error) {
      setResult('MISLUKT: ' + (error as Error).message)
    } finally {
      setRunning(false)
    }
  }
  return (
    <>
      <iframe
        ref={frame}
        src={source}
        title="De lokale stamboom"
        style={{ border: 0, width: '100%', height: '100dvh', display: 'block' }}
      />
      <section
        style={{
          position: 'fixed',
          bottom: 4,
          left: 4,
          right: 4,
          padding: 10,
          zIndex: 99,
          background: '#fff',
          border: '1px solid #345d49',
          fontSize: 12,
        }}
      >
        <button disabled={running} onClick={() => run('structured')}>
          Controleer Overzichtelijk
        </button>{' '}
        <button disabled={running} onClick={() => run('organic')}>
          Controleer Vrije boom
        </button>
        <p role="status">{result}</p>
      </section>
    </>
  )
}
