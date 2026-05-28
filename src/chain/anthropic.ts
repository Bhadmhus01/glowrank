import Anthropic from '@anthropic-ai/sdk'

// Thin wrapper around the Anthropic SDK (CLAUDE.md §4 — primary provider). Kept tiny so
// the chain calls can import `createTextMessage` and tests can mock this module without
// ever hitting the real API (CLAUDE.md §6 Step 5).

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (client === null) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

export interface CreateTextMessageParams {
  model: string
  system: string
  userContent: string
  maxTokens: number
  /** Defaults to 0 — classification/scoring calls want determinism. */
  temperature?: number
}

/** Single-turn text request; returns the concatenated text output. */
export async function createTextMessage(params: CreateTextMessageParams): Promise<string> {
  const response = await getClient().messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature ?? 0,
    system: params.system,
    messages: [{ role: 'user', content: params.userContent }],
  })

  return response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
}

export interface VisionImageInput {
  mediaType: 'image/jpeg' | 'image/png'
  bytes: Uint8Array
}

export interface CreateVisionMessageParams {
  model: string
  system: string
  userText: string
  images: VisionImageInput[]
  maxTokens: number
  /** Defaults to 0. */
  temperature?: number
}

/**
 * Single-turn multimodal request: images (base64) followed by a text block.
 * Returns the concatenated text output. Used by Call 2 (the only vision call).
 */
export async function createVisionMessage(params: CreateVisionMessageParams): Promise<string> {
  const imageBlocks = params.images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: Buffer.from(img.bytes).toString('base64'),
    },
  }))

  const response = await getClient().messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature ?? 0,
    system: params.system,
    messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: params.userText }] }],
  })

  return response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
}
