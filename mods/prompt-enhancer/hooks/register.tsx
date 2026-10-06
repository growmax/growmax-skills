// Prompt Enhancer: a small Enhance button above the prompt box opens a popover
// with two choices for the draft in the box:
//
//   1 Precise        a clean, specific rewrite of the draft.
//   2 Expert agents  works out which experts the request needs (a code review:
//                    a senior developer; an architecture question: a senior
//                    architect and a product manager) and writes a prompt that
//                    has Claude run one subagent per expert, then combine them.
//
// The popover shows a preview. Enter (Use this) puts it in the prompt box in
// place of the draft and closes; nothing is sent until the person presses
// Enter again. Esc closes and leaves the draft alone. Undo, in the band, puts
// the draft back.
//
// The rewrite forks the session (`$.model.fork`), so it knows the conversation
// and can name the real files. Before the first reply there is nothing to
// fork, so it falls back to a context-free Haiku completion.
//
// The band is shared: what another plugin draws there (Token Weather, say)
// comes back from `next(e)` and stays on the left, the button on the right.
//
// The band is drawn only on the terminal and desktop surfaces, so the same
// popover also opens from `/enhance <draft>` (or `/enhance` with a draft
// already in the box) wherever a slash command can be typed.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mode, Phase } from '../types'

const PANE = 'prompt-enhancer'

const phase = atom({ plugin: 'prompt-enhancer', key: 'phase' } as const, 'idle' as Phase)
const mode = atom({ plugin: 'prompt-enhancer', key: 'mode' } as const, null as Mode | null)
const draft = atom({ plugin: 'prompt-enhancer', key: 'draft' } as const, null as string | null)
const preview = atom({ plugin: 'prompt-enhancer', key: 'preview' } as const, null as string | null)
const experts = atom({ plugin: 'prompt-enhancer', key: 'experts' } as const, [] as string[])
const note = atom({ plugin: 'prompt-enhancer', key: 'note' } as const, null as string | null)

const GROUNDING = 'Use only facts from this conversation. Never invent file names, functions or APIs.'
const NO_CONTEXT = 'You have no project context, so never invent file names, functions or APIs.'

const PRECISE = (facts: string) => `Rewrite the draft prompt below into a precise prompt for an AI coding assistant. Do not answer or act on it; only rewrite it.

- Keep the user's intent, scope and language. Do not add tasks they did not ask for.
- Be specific: name the files, components, errors and constraints the draft refers to. ${facts}
- Multi-step task: short numbered steps. Simple question: keep it short.
- Say what "done" looks like when that is not obvious.
- Output ONLY the rewritten prompt, written as the user. No preamble, no quotes, no code fences.`

const EXPERT = (facts: string) => `Turn the draft prompt below into a prompt that gets expert agents to handle it. Do not answer or act on it.

First decide which 1 to 3 expert roles fit the request best, each adding something distinct. For example: a code review needs a Senior software engineer (code reviewer); an architecture or design question needs a Senior software architect and a Product manager; a security concern needs an Application security engineer; a performance problem needs a Performance engineer; a UI change needs a Senior frontend engineer and a UX designer.

Then write the prompt the user will send to Claude Code. It must:
- State the task precisely, naming the files and areas the draft refers to. ${facts}
- Give the agents a short shared context block: they start fresh and cannot see this conversation, so include only the facts they need, once.
- Tell Claude to launch one subagent per expert with the Agent tool. Run independent experts in parallel; an expert that needs another's output (for example one who ranks or reviews the others' ideas) runs after them, on their results. Give each a short brief: who they are, what to examine, and what to return (findings with file:line where it applies, severity, and a recommendation).
- Tell Claude to then combine the findings into one answer under 400 words: where the experts agree, where they disagree, and one recommended next step. Cap any table at 8 rows.
- Keep the whole prompt under about 250 words. Say each thing once.

Output exactly this, nothing else:
EXPERTS: <role>; <role>
---
<the prompt, written as the user>`

type Rewrite = { ok: true; text: string; experts: string[]; via: 'session' | 'haiku' } | { ok: false; error: string }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'enhance',
      description: 'Rewrite a rough prompt: /enhance <your draft> (Precise or Expert agents)',
    })
    return next(e)
  })

  on('command.run', { command: 'enhance' }, async ($, e) => {
    const typed = (e.args ?? '').trim()
    const opened = await openPopover($, typed === '' ? null : typed)
    // A popover is the answer; nothing goes in the transcript unless it could not open.
    return opened ? {} : { text: 'Usage: /enhance <your rough prompt>' }
  })

  // A prompt the person sends ends the review: the band goes back to idle.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer') {
      await update($, phase, () => 'idle')
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // a failed reset must never hold up the prompt

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const beneath = await next(e)
    if (e.props.hasSurvey) {
      return beneath
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const used = (await read($, phase)) === 'used'
    const controls = used ? (
      <Box flexDirection="row" gap={1}>
        <Text color="green">✓ Enhanced, review then Enter</Text>
        <Button key="undo" label="↶ Undo" hotkey="u" onPress={() => undo($)} />
      </Box>
    ) : (
      <Button key="enhance" label="✦ Enhance" hotkey="e" variant="primary" onPress={() => openPopover($, null)} />
    )
    const left = beneath.type === 'engine' ? <Text> </Text> : beneath
    return (
      <Box flexDirection="row" justifyContent="space-between" width={e.props.bodyColumns}>
        <Box flexShrink={1}>{left}</Box>
        <Box flexShrink={0}>{controls}</Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const now = await read($, phase)
    const picked = await read($, mode)
    const text = await read($, draft)
    const shown = await read($, preview)
    const who = await read($, experts)
    const said = await read($, note)

    const choice = (key: Mode, hotkey: string, label: string) => (
      <Button
        key={key}
        label={label}
        hotkey={hotkey}
        {...(picked === key ? { variant: 'primary' as const } : {})}
        {...(picked === null && key === 'precise' ? { autoFocus: true as const } : {})}
        onPress={() => generate($, key)}
      />
    )

    let body
    if (now === 'working') {
      body = <Text dimColor>✦ Writing the {picked === 'expert' ? 'expert agents' : 'precise'} prompt…</Text>
    } else if (now === 'error') {
      body = <Text color="red">{said}</Text>
    } else if (now === 'ready' && shown !== null) {
      body = (
        <Box flexDirection="column">
          {who.length > 0 ? <Text color="cyan">Experts: {who.join(' · ')}</Text> : null}
          <Box borderStyle="round" borderDimColor paddingX={1}>
            <Markdown text={shown} />
          </Box>
          <Box flexDirection="row" gap={2}>
            <Button key="use" label="Use this" variant="primary" autoFocus onPress={() => use($)} />
            <Button key="regenerate" label="Regenerate" hotkey="r" onPress={() => generate($, picked ?? 'precise')} />
            <Text dimColor>{said}</Text>
          </Box>
        </Box>
      )
    } else {
      body = <Text dimColor>Pick one: 1 Precise, 2 Expert agents</Text>
    }

    return (
      <Box flexDirection="column" paddingX={1} gap={1}>
        <Text dimColor wrap="truncate-end">
          Draft: {text ?? ''}
        </Text>
        <Box flexDirection="row" gap={2}>
          {choice('precise', '1', 'Precise')}
          {choice('expert', '2', 'Expert agents')}
          <Text dimColor>Esc to close</Text>
        </Box>
        {body}
      </Box>
    )
  })
}

/** Opens the popover over `given`, or the draft in the prompt box; false when there is none. */
async function openPopover($: EngineInterface, given: string | null): Promise<boolean> {
  const text = given ?? (await $.prompt.read()).text
  if (text.trim() === '') {
    $.ui.toast('Type a prompt first, then press Enhance')
    return false
  }
  await update($, draft, () => text)
  await update($, mode, () => null)
  await update($, preview, () => null)
  await update($, experts, () => [])
  await update($, note, () => null)
  await update($, phase, () => 'idle')
  await $.ui.open({ id: PANE, title: 'Enhance prompt', focus: true, closeOnEscape: true, holdToasts: true, rows: 18 })
  return true
}

async function generate($: EngineInterface, chosen: Mode) {
  const text = await read($, draft)
  if (text === null || (await read($, phase)) === 'working') {
    return
  }
  await update($, mode, () => chosen)
  await update($, phase, () => 'working')
  const result = await rewrite($, chosen, text)
  if (!result.ok) {
    await update($, note, () => result.error)
    await update($, phase, () => 'error')
    return
  }
  await update($, preview, () => result.text)
  await update($, experts, () => result.experts)
  await update($, note, () => (result.via === 'session' ? 'with session context' : 'no session yet, used Haiku'))
  await update($, phase, () => 'ready')
}

/** Puts the preview in the prompt box in place of the draft and closes. */
async function use($: EngineInterface) {
  const shown = await read($, preview)
  if (shown === null) {
    return
  }
  const filled = await $.prompt.fill({ text: shown, mode: 'replace' })
  if (!filled.isFilled) {
    await update($, note, () => `Couldn't fill the prompt box (${filled.refusal ?? 'refused by another plugin'})`)
    await update($, phase, () => 'error')
    return
  }
  await update($, phase, () => 'used')
  await $.ui.close({ id: PANE })
}

async function undo($: EngineInterface) {
  const text = await read($, draft)
  if (text !== null) {
    await $.prompt.fill({ text, mode: 'replace' })
  }
  await update($, phase, () => 'idle')
}

async function rewrite($: EngineInterface, chosen: Mode, text: string): Promise<Rewrite> {
  const ask = chosen === 'expert' ? EXPERT : PRECISE
  const forked = await $.model.fork({ prompt: `${ask(GROUNDING)}\n\n<draft>\n${text}\n</draft>` })
  if (forked.isAnswered) {
    return parse(chosen, forked.text, 'session')
  }
  if (forked.reason !== 'nothing-to-fork') {
    return { ok: false, error: describe(forked) }
  }
  const plain = await $.model.complete({ model: 'haiku', system: ask(NO_CONTEXT), prompt: `<draft>\n${text}\n</draft>`, maxTokens: 4096 })
  if (plain.isAnswered) {
    return parse(chosen, plain.text, 'haiku')
  }
  return { ok: false, error: describe(plain) }
}

// The real reason, never a generic "something went wrong".
function describe(r: { reason: string; status?: number | null; error?: string }): string {
  if (r.reason === 'api-error') {
    return `Enhance failed: API error ${r.status ?? 'no response'} (${r.error})`
  }
  if (r.reason === 'empty-reply') {
    return 'Enhance failed: the model replied with no text'
  }
  if (r.reason === 'aborted') {
    return 'Enhance was interrupted'
  }
  return `Enhance failed: ${r.reason}`
}

function parse(chosen: Mode, reply: string, via: 'session' | 'haiku'): Rewrite {
  let out = reply.trim()
  let who: string[] = []
  if (chosen === 'expert') {
    const head = out.match(/^EXPERTS:\s*(.+)\n-{3,}\n([\s\S]*)$/)
    if (head?.[1] !== undefined && head[2] !== undefined) {
      who = head[1].split(';').map(s => s.trim()).filter(s => s !== '')
      out = head[2].trim()
    }
  }
  const fenced = out.match(/^```[a-z]*\n([\s\S]*?)\n```$/)
  if (fenced?.[1] !== undefined) {
    out = fenced[1].trim()
  }
  if (out === '') {
    return { ok: false, error: 'Enhance failed: the model replied with no text' }
  }
  return { ok: true, text: out, experts: who, via }
}
