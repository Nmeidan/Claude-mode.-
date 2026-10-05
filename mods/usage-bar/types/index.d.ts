export type Window = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-bar': { windows: Window[]; now: number; isHidden: boolean }
  }
}
