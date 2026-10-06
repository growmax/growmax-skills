import { expect, test } from 'claude-code/testing'
import type { ModelForkResult, On } from 'claude-code'

const USAGE = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const SURFACES = ['terminal', 'desktop'] as const
type Surface = (typeof SURFACES)[number]
const DRAFT = 'review the cart quantity code'

const band = (surface: Surface) => ({
  plugin: 'prompt-enhancer',
  surface,
  component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

const pane = (surface: Surface) => ({
  plugin: 'prompt-enhancer',
  surface,
  component: 'Pane' as const,
  requestId: 'prompt-enhancer',
  props: { title: 'Enhance prompt', isFocused: true, bodyColumns: 100, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 18 }, view: {} },
})

/** A fake prompt box, model and pane host beneath the plugin. */
function fakeSession(on: On, fork: (prompt: string) => ModelForkResult) {
  const s = { text: DRAFT, forks: 0, completes: 0, opened: 0, closed: 0, toasts: [] as string[] }
  on('prompt.read', () => ({ value: { text: s.text, cursor: s.text.length } }))
  on('prompt.fill', (_$, e) => {
    s.text = e.text
    return { isFilled: true }
  })
  on('model.fork', (_$, e) => {
    s.forks += 1
    return { value: fork(e.prompt) }
  })
  on('model.complete', () => {
    s.completes += 1
    return { value: { isAnswered: true, text: 'Plain rewrite of the draft', usage: USAGE } }
  })
  on('ui.open', () => {
    s.opened += 1
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    s.closed += 1
    return { value: undefined }
  })
  on('ui.toast', (_$, e) => {
    s.toasts.push(String(e.text))
    return { value: undefined }
  })
  // What another plugin (Token Weather) draws in the band.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>☀ Clear 4% of context</Text>
  })
  return s
}

const runEnhance = (args: string) => ({
  command: 'enhance',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 120 },
})

const answered = (text: string): ModelForkResult => ({ isAnswered: true, text, usage: USAGE })

test('Precise: Enhance opens the popover, Use this replaces the draft, Undo restores it', async ($, on) => {
  const s = fakeSession(on, () => answered('```\nReview the cart quantity handler for bugs.\n```'))
  for (const surface of SURFACES) {
    s.text = DRAFT
    const b = await $.ui.mount(band(surface))
    expect(await b.find({ text: /Clear 4% of context/ })).toBeDefined()
    await b.press({ key: 'enhance' })
    expect(s.opened).toBeGreaterThan(0)

    const p = await $.ui.mount(pane(surface))
    expect(await p.find({ text: /review the cart quantity code/ })).toBeDefined()
    await p.press({ key: 'precise' })
    expect(await p.find({ text: /Review the cart quantity handler for bugs\./ })).toBeDefined()
    expect(s.text).toBe(DRAFT) // nothing touches the box until Use this

    await p.press({ key: 'use' })
    expect(s.text).toBe('Review the cart quantity handler for bugs.')
    expect(s.closed).toBeGreaterThan(0)
    await p.unmount()

    expect(await b.find({ key: 'undo' })).toBeDefined()
    expect(await b.find({ text: /Clear 4% of context/ })).toBeDefined()
    await b.press({ key: 'undo' })
    expect(s.text).toBe(DRAFT)
    await b.unmount()
  }
})

test('Expert agents: shows the chosen experts and the agent prompt', async ($, on) => {
  let asked = ''
  const s = fakeSession(on, prompt => {
    asked = prompt
    return answered('EXPERTS: Senior software engineer (code reviewer)\n---\nLaunch a code-review subagent to review the cart quantity code.')
  })
  const b = await $.ui.mount(band('terminal'))
  await b.press({ key: 'enhance' })
  const p = await $.ui.mount(pane('terminal'))
  await p.press({ key: 'expert' })
  expect(asked).toContain('Agent tool')
  expect(await p.find({ text: /Experts: Senior software engineer \(code reviewer\)/ })).toBeDefined()
  await p.press({ key: 'use' })
  expect(s.text).toBe('Launch a code-review subagent to review the cart quantity code.')
})

test('A new session with nothing to fork falls back to Haiku', async ($, on) => {
  const s = fakeSession(on, () => ({ isAnswered: false, reason: 'nothing-to-fork' }))
  const b = await $.ui.mount(band('terminal'))
  await b.press({ key: 'enhance' })
  const p = await $.ui.mount(pane('terminal'))
  await p.press({ key: 'precise' })
  expect(s.completes).toBe(1)
  expect(await p.find({ text: /no session yet, used Haiku/ })).toBeDefined()
})

test('An API error shows the real status and leaves the draft alone', async ($, on) => {
  const s = fakeSession(on, () => ({ isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: USAGE }))
  const b = await $.ui.mount(band('terminal'))
  await b.press({ key: 'enhance' })
  const p = await $.ui.mount(pane('terminal'))
  await p.press({ key: 'expert' })
  expect(await p.find({ text: /API error 529 \(overloaded\)/ })).toBeDefined()
  expect(s.text).toBe(DRAFT)
})

test('An empty box does not open the popover', async ($, on) => {
  const s = fakeSession(on, () => answered('x'))
  s.text = '   '
  const b = await $.ui.mount(band('terminal'))
  await b.press({ key: 'enhance' })
  expect(s.opened).toBe(0)
  expect(s.forks).toBe(0)
  expect(s.toasts[0]).toContain('Type a prompt first')
})

test('/enhance <draft> opens the popover on that draft, even with an empty box', async ($, on) => {
  const s = fakeSession(on, () => answered('Review the cart quantity handler for bugs.'))
  s.text = ''
  const ran = await $.command.run(runEnhance('review the cart code'))
  expect(ran.text).toBeUndefined()
  expect(s.opened).toBe(1)
  const p = await $.ui.mount(pane('terminal'))
  expect(await p.find({ text: /review the cart code/ })).toBeDefined()
  await p.press({ key: 'precise' })
  await p.press({ key: 'use' })
  expect(s.text).toBe('Review the cart quantity handler for bugs.')
})

test('/enhance with no draft anywhere says how to use it', async ($, on) => {
  const s = fakeSession(on, () => answered('x'))
  s.text = ''
  const ran = await $.command.run(runEnhance(''))
  expect(ran.text).toContain('Usage: /enhance')
  expect(s.opened).toBe(0)
})
