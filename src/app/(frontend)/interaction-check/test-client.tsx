'use client'
// This harness exercises the real homepage served at /, including its actual DOM.
// It is only reachable in development and never opens the administrator interface.
import { useRef, useState } from 'react'
import { UPWARD_BOTTOM_PADDING } from '@/lib/focus'
export function InteractionCheck({ source = '/' }: { source?: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [result, setResult] = useState('Nog niet uitgevoerd')
  const [running, setRunning] = useState(false)
  async function run(style: 'structured' | 'organic') {
    const doc = frame.current!.contentDocument!
    const canvas = doc.querySelector<HTMLElement>('[data-testid="tree-canvas"]')!
    if (!canvas) {
      setResult('Schema niet zichtbaar: log eerst in bij /admin.')
      return
    }
    let rect = canvas.getBoundingClientRect()
    const nextFrame = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
    const settle = async () => {
      // Wait for the 350 ms viewport animation, including on displays whose
      // refresh rate makes a fixed number of frames finish earlier than that.
      await new Promise<void>((resolve) => setTimeout(resolve, 430))
      await nextFrame()
    }
    const transform = () =>
      new DOMMatrix(
        doc.defaultView!.getComputedStyle(doc.querySelector<HTMLElement>('.react-flow__viewport')!)
          .transform,
      )
    const pointer = (target: HTMLElement, x: number, y: number, type = 'mouse', buttons = 0) =>
      target.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: type,
          clientX: x + rect.left,
          clientY: y + rect.top,
          buttons,
        }),
      )
    const assert = (value: boolean, message: string) => {
      if (!value) throw new Error(message)
    }
    const resetAnchor = () =>
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', buttons: 1 }),
      )
    try {
      setRunning(true)
      setResult('Controle wordt uitgevoerd…')
      doc.querySelector<HTMLButtonElement>('[aria-label="Persoonsgegevens sluiten"]')?.click()
      doc
        .querySelectorAll<HTMLButtonElement>('.tree-style-toggle button')
        [style === 'organic' ? 1 : 0]?.click()
      await settle()
      rect = canvas.getBoundingClientRect()
      // A preceding run deliberately ends with the user's manual pause intact.
      doc.querySelector<HTMLButtonElement>('[aria-label="Muisbeweging hervatten"]')?.click()
      await nextFrame()
      const upwards = !!doc.querySelector('.upward-preview')
      const marginX = Math.min(112, rect.width / 5),
        marginY = Math.min(112, rect.height / 5)
      const pointerX = Math.min(140, rect.width / 4),
        pointerY = Math.min(140, rect.height / 4)
      // Start in the middle of the complete diagram, then ensure both axes overflow.
      doc.querySelector<HTMLButtonElement>('[aria-label="Hele stamboom in beeld"]')!.click()
      await settle()
      for (let i = 0; i < 12 && transform().m11 < 1.2; i++) {
        doc.querySelector<HTMLButtonElement>('[aria-label="Inzoomen"]')!.click()
        await settle()
      }
      const x = rect.width / 2,
        y = rect.height / 2
      const nodeRects = () =>
        [...doc.querySelectorAll<HTMLElement>('.react-flow__node')].map((node) =>
          node.getBoundingClientRect(),
        )
      const checkDirection = async (dx: number, dy: number, label: string) => {
        resetAnchor()
        pointer(canvas, x, y)
        await nextFrame()
        const before = transform()
        pointer(canvas, x + dx, y + dy)
        await nextFrame()
        const after = transform()
        assert(
          dx > 0
            ? after.m41 < before.m41
            : dx < 0
              ? after.m41 > before.m41
              : dy > 0
                ? after.m42 < before.m42
                : after.m42 > before.m42,
          `Verkeerde richting: ${label}`,
        )
      }
      await checkDirection(20, 0, 'rechts → vlak links')
      await checkDirection(-20, 0, 'links → vlak rechts')
      await checkDirection(0, 20, 'omlaag → vlak omhoog')
      await checkDirection(0, -20, 'omhoog → vlak omlaag')
      const checkConstantSteps = async (axis: 'x' | 'y') => {
        resetAnchor()
        pointer(canvas, x, y)
        await nextFrame()
        let previous = 0,
          previousMatrix = transform(),
          ratio: number | undefined
        for (const offset of [6, 12, 18, 24, 18, 12, 6, 0, -6, -12]) {
          pointer(canvas, x + (axis === 'x' ? offset : 0), y + (axis === 'y' ? offset : 0))
          await nextFrame()
          const matrix = transform()
          const movement =
            axis === 'x' ? matrix.m41 - previousMatrix.m41 : matrix.m42 - previousMatrix.m42
          const nextRatio = movement / (offset - previous)
          if (ratio === undefined) ratio = nextRatio
          assert(Math.abs(nextRatio - ratio) < 0.05, `Geen constante muisverplaatsing op ${axis}`)
          previous = offset
          previousMatrix = matrix
        }
      }
      await checkConstantSteps('x')
      await checkConstantSteps('y')
      resetAnchor()
      pointer(canvas, x, y)
      await nextFrame()
      pointer(canvas, rect.width - pointerX, pointerY)
      await nextFrame()
      let cards = nodeRects()
      assert(
        Math.abs(Math.max(...cards.map((r) => r.right)) - (rect.right - marginX)) < 2,
        'Rechtse buitenste kaart onbereikbaar',
      )
      assert(
        Math.abs(Math.min(...cards.map((r) => r.top)) - (rect.top + marginY)) < 2,
        'Bovenste kaart onbereikbaar',
      )
      pointer(canvas, pointerX, rect.height - pointerY)
      await nextFrame()
      cards = nodeRects()
      assert(
        Math.abs(Math.min(...cards.map((r) => r.left)) - (rect.left + marginX)) < 2,
        'Linkse buitenste kaart onbereikbaar',
      )
      assert(
        Math.abs(
          Math.max(...cards.map((r) => r.bottom)) -
            (rect.bottom - marginY - (upwards ? UPWARD_BOTTOM_PADDING * transform().m11 : 0)),
        ) < 2,
        'Onderste kaart onbereikbaar',
      )
      const still = transform().toString()
      await settle()
      assert(transform().toString() === still, 'Beeld beweegt door bij stilstand')
      pointer(canvas, x + 40, y + 28, 'touch')
      await nextFrame()
      assert(transform().toString() === still, 'Touch activeert muisbediening')
      const pause = doc.querySelector<HTMLButtonElement>('[aria-label="Muisbeweging pauzeren"]')!
      pause.click()
      await nextFrame()
      pointer(canvas, x, y)
      pointer(canvas, x + 40, y + 40)
      await nextFrame()
      assert(transform().toString() === still, 'Pauzeknop pauzeert niet')
      doc.querySelector<HTMLButtonElement>('[aria-label="Muisbeweging hervatten"]')!.click()
      await nextFrame()
      resetAnchor()
      pointer(canvas, x, y)
      await nextFrame()
      const beforeClick = transform().toString()
      pointer(canvas, x + 20, y + 20, 'mouse', 1)
      await nextFrame()
      assert(transform().toString() === beforeClick, 'Beweging tijdens klik')
      canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaX: 0, deltaY: 0 }))
      await nextFrame()
      pointer(canvas, x + 30, y + 30)
      await nextFrame()
      assert(transform().toString() === beforeClick, 'Trackpad-scrollen verstoord')
      const control = doc.querySelector<HTMLElement>('.map-controls')!
      pointer(control, x, y)
      pointer(control, x + 20, y + 20)
      await nextFrame()
      assert(transform().toString() === beforeClick, 'Knoppen schuiven mee')
      doc.querySelector<HTMLButtonElement>('[aria-label="Bekijk Sophie Voorbeeld"]')!.click()
      await settle()
      assert(
        !!doc.querySelector('[aria-label="Gegevens van Sophie Voorbeeld"]'),
        'Naamkaart niet aanklikbaar',
      )
      const visibleCanvas = canvas.getBoundingClientRect()
      const chosen = doc
        .querySelector<HTMLElement>('[aria-label="Bekijk Sophie Voorbeeld"]')!
        .getBoundingClientRect()
      assert(
        chosen.left >= visibleCanvas.left &&
          chosen.right <= visibleCanvas.right &&
          chosen.top >= visibleCanvas.top &&
          chosen.bottom <= visibleCanvas.bottom,
        'De gekozen persoon is na focus niet zichtbaar',
      )
      const frozen = transform().toString()
      pointer(canvas, 1, 1)
      pointer(canvas, rect.width - 1, rect.height - 1)
      await nextFrame()
      assert(transform().toString() === frozen, 'Selectie pauzeert muisbeweging niet')
      assert(
        !![...doc.querySelectorAll('aside[aria-label="Gegevens van Sophie Voorbeeld"] h3')].find(
          (heading) => heading.textContent?.includes('Ouders'),
        ),
        'Gekoppelde ouders ontbreken',
      )
      const anna = () =>
        doc.querySelector<HTMLButtonElement>('[aria-label="Bekijk Anna van de Linde"]')!
      anna().click()
      await settle()
      const annaPanel = doc.querySelector('[aria-label="Gegevens van Anna van de Linde"]')
      assert(!!annaPanel, 'Wisselen van selectie mislukt')
      assert(
        ![...annaPanel!.querySelectorAll('h3')].some((heading) =>
          heading.textContent?.includes('Ouders'),
        ),
        'Lege oudersectie is nog zichtbaar',
      )
      const switched = transform().toString()
      pointer(canvas, x, y)
      pointer(canvas, 1, 1)
      await nextFrame()
      assert(transform().toString() === switched, 'Andere kaart hervat muisbeweging te vroeg')
      anna().click()
      await settle()
      assert(!doc.querySelector('.detail-panel'), 'Nogmaals klikken deselecteert niet')
      assert(anna().getAttribute('aria-pressed') === 'false', 'Kaart blijft geselecteerd')
      const beforeResume = transform().toString()
      pointer(canvas, x, y)
      await nextFrame()
      assert(transform().toString() === beforeResume, 'Hervatten verspringt bij eerste beweging')
      pointer(canvas, 1, 1)
      await nextFrame()
      const near = transform().toString()
      pointer(canvas, rect.width - 1, rect.height - 1)
      await nextFrame()
      assert(transform().toString() !== near, 'Muisbeweging hervat niet na deselecteren')
      doc.querySelector<HTMLButtonElement>('[aria-label="Muisbeweging pauzeren"]')!.click()
      await nextFrame()
      anna().click()
      await settle()
      anna().click()
      await settle()
      assert(
        !!doc.querySelector('[aria-label="Muisbeweging hervatten"]'),
        'Handmatige pauze gaat verloren bij deselecteren',
      )
      const manualPause = transform().toString()
      pointer(canvas, 1, 1)
      pointer(canvas, rect.width - 1, rect.height - 1)
      await nextFrame()
      assert(transform().toString() === manualPause, 'Handmatige pauze is niet behouden')
      setResult(
        `GESLAAGD (${style}) OP ${source}: constante muisverplaatsing, extra witruimte, uitersten bereikbaar zonder de muisrand, richtingen, stilstand, touch, pauze, trackpad, knoppen, persoonsfocus, selectie pauzeert, wisselen blijft gepauzeerd, deselecteren hervat zonder sprong, handmatige pauze blijft behouden en alleen ingevulde oudersecties zichtbaar.`,
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
        title="De echte homepage op poort 3000"
        style={{ border: 0, width: '100%', height: '100dvh', display: 'block' }}
      />
      <div
        style={{
          position: 'fixed',
          left: 8,
          bottom: 1,
          zIndex: 99,
          background: '#fff',
          border: '1px solid #345d49',
          padding: 8,
          fontSize: 11,
          maxWidth: '98vw',
        }}
      >
        <button disabled={running} onClick={() => run('structured')}>
          Controleer Overzichtelijk
        </button>
        <button disabled={running} onClick={() => run('organic')}>
          Controleer Vrije boom
        </button>
        <output style={{ marginLeft: 10 }}>{result}</output>
      </div>
    </>
  )
}
