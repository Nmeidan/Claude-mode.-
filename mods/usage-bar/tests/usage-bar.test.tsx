import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const NOW = Date.parse('2026-10-05T12:00:00Z')
const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10 },
} as const

const LIMITS = [
  { kind: 'seven_day', percentUsed: 40, resetsAt: '2026-10-08T15:00:00Z' },
  { kind: 'five_hour', percentUsed: 75.5, resetsAt: '2026-10-05T14:14:00Z' },
]

// Stands for the engine's own band: an empty row the plugin draws over or passes to.
const engineBand = (on: On) =>
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="engine">engine</Text>
  })

const usage = (rateLimits: typeof LIMITS) => ({
  startedAt: NOW,
  context: { window: 200_000 },
  rateLimits,
})

test('shows what is left in each window and when it resets', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on)
  engineBand(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: usage(LIMITS) }) as never)
  on('command.register', () => ({ value: {} }) as never)
  await $.session.start({ cwd: '/' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'usage-bar', surface, ...BAND } as never)
    const text = (await ui.find({ type: 'Box', key: 'five_hour' }))?.text ?? ''
    expect(text).toContain('5h')
    expect(text).toContain('24% left')
    expect(text).toContain('resets in 2h 14m')
    const week = (await ui.find({ type: 'Box', key: 'seven_day' }))?.text ?? ''
    expect(week).toContain('Week')
    expect(week).toContain('60% left')
    expect(week).toContain('resets in 3d 3h')
    await ui.unmount()
  }
})

test('draws nothing off a subscription', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on)
  engineBand(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: usage([]) }) as never)
  on('command.register', () => ({ value: {} }) as never)
  await $.session.start({ cwd: '/' } as never)

  const ui = await $.ui.mount({ plugin: 'usage-bar', surface: 'terminal', ...BAND } as never)
  expect(await ui.find({ type: 'Box', key: 'five_hour' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
  await ui.unmount()
})

test('follows new readings from session.measure', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on)
  engineBand(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: usage([]) }) as never)
  on('command.register', () => ({ value: {} }) as never)
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/' } as never)
  await $.session.measure({
    context: { window: 200_000 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 95, resetsAt: '2026-10-05T12:30:00Z' }],
    changed: ['rateLimits'],
  } as never)

  const ui = await $.ui.mount({ plugin: 'usage-bar', surface: 'terminal', ...BAND } as never)
  const text = (await ui.find({ type: 'Box', key: 'five_hour' }))?.text ?? ''
  expect(text).toContain('5% left')
  expect(text).toContain('resets in 30m')
  await ui.unmount()
})
