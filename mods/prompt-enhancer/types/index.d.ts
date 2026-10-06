// idle: nothing yet. working: the model is writing. ready: a preview to use.
// used: the result is in the prompt box (band offers Undo). error: see note.
export type Phase = 'idle' | 'working' | 'ready' | 'used' | 'error'

// precise: a clean rewrite. expert: picks the expert roles and writes a prompt
// that has Claude run one subagent per expert, then combine their findings.
export type Mode = 'precise' | 'expert'

declare module 'claude-code' {
  interface PluginState {
    'prompt-enhancer': {
      phase: Phase
      mode: Mode | null
      // The draft as it was when the popover opened, for the rewrite and Undo.
      draft: string | null
      preview: string | null
      experts: string[]
      // One line: what happened, or the real error.
      note: string | null
    }
  }
}
