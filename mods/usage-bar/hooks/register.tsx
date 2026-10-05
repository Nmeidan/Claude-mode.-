import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Window } from '../types'
import { bar, color, label, left, ordered, summary, until } from './format'

const windows = atom({ plugin: 'usage-bar', key: 'windows' } as const, [] as Window[])
const now = atom({ plugin: 'usage-bar', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-bar', key: 'isHidden' } as const, false)

const MINUTE = 60_000

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const usage = await $.session.usage()
    await update($, windows, () => usage.rateLimits.map(w => ({ ...w })))
    const t = await $.clock.now()
    await update($, now, () => t)
    // Keep the reset countdowns current between turns.
    $.clock.every(MINUTE, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    })
    await $.command.register({
      name: 'usage-bar',
      description: 'Show or hide the usage bar above the prompt',
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, windows, () => e.rateLimits.map(w => ({ ...w })))
      const t = await $.clock.now()
      await update($, now, () => t)
    }
    return next(e)
  })

  on('command.run', { command: 'usage-bar' }, async $ => {
    const hidden = await update($, isHidden, v => !v)
    if (hidden) return { text: 'Usage bar hidden. Run /usage-bar to show it again.' }
    const ws = ordered(await read($, windows))
    const t = await $.clock.now()
    return {
      text: ws.length
        ? `Usage bar shown. ${ws.map(w => summary(w, t)).join(' | ')}`
        : 'Usage bar shown. No usage reading yet: it appears after the first reply, on a Pro or Max plan (not an API key).',
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const ws = ordered(await read($, windows))
    // Nothing to show off a subscription (API key) or before the first reply.
    if (ws.length === 0) return next(e)
    const t = Math.max(await read($, now), await $.clock.now())

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" flexWrap="wrap">
        {ws.map((w, i) => {
          const reset = until(w.resetsAt, t)
          return (
            <Box key={w.kind} marginRight={i < ws.length - 1 ? 3 : 0}>
              <Text bold>{label(w.kind)} </Text>
              <Text color={color(w)}>{bar(w)}</Text>
              <Text> {left(w)}% left</Text>
              {reset ? <Text dimColor> · resets in {reset}</Text> : null}
            </Box>
          )
        })}
      </Box>
    )
  })
}
