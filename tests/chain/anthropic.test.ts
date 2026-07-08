import { describe, it, expect, vi, beforeEach } from 'vitest'

// Regression guard for two live-only failures found by the report harness:
//   1. Call 4's Opus model 400s when `temperature` is sent → it must be OMITTED when undefined.
//   2. Long non-streaming generations drop the connection → the wrapper must use streaming.
// Tests mock the SDK so they never hit the real API (CLAUDE.md §6 Step 5).

const { streamCalls, createCalls } = vi.hoisted(() => ({
  streamCalls: [] as Array<Record<string, unknown>>,
  createCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('@anthropic-ai/sdk', () => ({
  // function (not arrow) so `new Anthropic()` is constructable under vitest 4.
  default: vi.fn(function () {
    return {
      messages: {
        stream: vi.fn((params: Record<string, unknown>) => {
          streamCalls.push(params)
          return { finalMessage: async () => ({ content: [{ type: 'text', text: 'hi' }] }) }
        }),
        // Present so a regression back to non-streaming would be visible in tests.
        create: vi.fn((params: Record<string, unknown>) => {
          createCalls.push(params)
          return Promise.resolve({ content: [{ type: 'text', text: 'hi' }] })
        }),
      },
    }
  }),
}))

const { createTextMessage, createVisionMessage } = await import('../../src/chain/anthropic')

beforeEach(() => {
  streamCalls.length = 0
  createCalls.length = 0
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
})

describe('createTextMessage', () => {
  it('streams (does not use non-streaming create) and returns the accumulated text', async () => {
    const out = await createTextMessage({
      model: 'm',
      system: 's',
      userContent: 'u',
      maxTokens: 100,
    })
    expect(out).toBe('hi')
    expect(streamCalls).toHaveLength(1)
    expect(createCalls).toHaveLength(0)
  })

  it('OMITS temperature when not provided (Opus rejects the param)', async () => {
    await createTextMessage({ model: 'm', system: 's', userContent: 'u', maxTokens: 100 })
    expect(streamCalls[0]).not.toHaveProperty('temperature')
  })

  it('sends temperature when explicitly provided, including 0', async () => {
    await createTextMessage({
      model: 'm',
      system: 's',
      userContent: 'u',
      maxTokens: 100,
      temperature: 0,
    })
    expect(streamCalls[0].temperature).toBe(0)
  })
})

describe('createVisionMessage', () => {
  it('omits temperature when unset and sends image + text blocks', async () => {
    await createVisionMessage({
      model: 'm',
      system: 's',
      userText: 'look',
      images: [{ mediaType: 'image/jpeg', bytes: new Uint8Array([1, 2, 3]) }],
      maxTokens: 100,
    })
    expect(streamCalls[0]).not.toHaveProperty('temperature')
    const content = (streamCalls[0].messages as Array<{ content: Array<{ type: string }> }>)[0]
      .content
    expect(content).toHaveLength(2)
    expect(content[0].type).toBe('image')
    expect(content[1].type).toBe('text')
  })
})
