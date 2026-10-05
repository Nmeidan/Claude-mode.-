import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Window } from '../types'
import { bar, color, label, left, ordered, summary, until } from './format'

const windows = atom({ plugin: 'usage-bar', key: 'windows' } as const, [] as Window[])
const now = atom({ plugin: 'usage-bar', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-bar', key: 'isHidden' } as const, false)

const MINUTE = 60_000
const VERSION = '0.3.0'

const copy = (ws: readonly Window[]): Window[] => ws.map(w => ({ ...w }))

/** Re-read the windows from the engine and stamp the time, which redraws the band. */
const refresh = async ($: EngineInterface): Promise<Window[]> => {
  const ws = copy((await $.session.usage()).rateLimits)
  await update($, windows, () => ws)
  const t = await $.clock.now()
  await update($, now, () => t)
  return ws
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    // Keep the reset countdowns current between turns.
    $.clock.every(MINUTE, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    })
    await $.command.register({
      name: 'usage-bar',
      description: 'Usage bar: show status, or `hide` / `show` the band',
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, windows, () => copy(e.rateLimits))
      const t = await $.clock.now()
      await update($, now, () => t)
    }
    return next(e)
  })

  // A second source: after every turn, ask the engine directly.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('command.run', { command: 'usage-bar' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'hide' || arg === 'show') {
      await update($, isHidden, () => arg === 'hide')
    }
    const hidden = await read($, isHidden)
    const ws = ordered(await refresh($))
    const t = await $.clock.now()
    const surfaces = (await $.session.surfaces()).join(', ') || 'none'
    const state = hidden ? 'hidden (`/usage-bar show` to show it)' : 'on'
    return {
      text: ws.length
        ? `Usage bar v${VERSION} (on ${surfaces}) is ${state}. ${ws.map(w => summary(w, t)).join(' | ')}`
        : `Usage bar v${VERSION} (on ${surfaces}) is ${state}, but Claude Code has no usage reading yet. It arrives with a reply from Claude on a Pro or Max plan; with an API key there is none.`,
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    let ws = await read($, windows)
    if (ws.length === 0) ws = copy((await $.session.usage()).rateLimits)
    // Nothing to show off a subscription (API key) or before the first reply.
    if (ws.length === 0) return next(e)
    const t = Math.max(await read($, now), await $.clock.now())

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" flexWrap="wrap" alignItems="center">
        {ordered(ws).map(w => {
          const reset = until(w.resetsAt, t)
          return (
            <Box key={w.kind} marginRight={3}>
              <Text bold>{label(w.kind)} </Text>
              <Text color={color(w)}>{bar(w)}</Text>
              <Text> {left(w)}% left</Text>
              {reset ? <Text dimColor> · resets in {reset}</Text> : null}
            </Box>
          )
        })}
        <Button
          key="close"
          label="✕"
          onPress={async () => {
            await update($, isHidden, () => true)
            $.ui.toast('Usage bar hidden. Type /usage-bar show to bring it back.')
          }}
        />
      </Box>
    )
  })
}
