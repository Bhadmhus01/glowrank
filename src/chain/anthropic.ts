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
  /**
   * Only sent when provided. Determinism-sensitive calls pass 0; leave it undefined for models
   * that no longer accept `temperature` (some newer models reject the parameter entirely).
   */
  temperature?: number
}

/**
 * Single-turn text request; returns the concatenated text output. Uses streaming so long
 * generations (e.g. Call 4's full report) keep the HTTP connection alive with incremental
 * deltas — a non-streaming request can exceed an intermediary/socket idle timeout and drop
 * before the response completes. `finalMessage()` still resolves to the full accumulated text.
 */
export async function createTextMessage(params: CreateTextMessageParams): Promise<string> {
  const response = await getClient()
    .messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      system: params.system,
      messages: [{ role: 'user', content: params.userContent }],
    })
    .finalMessage()

  return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
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
  /** Only sent when provided (see CreateTextMessageParams.temperature). */
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

  const response = await getClient()
    .messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      system: params.system,
      messages: [
        { role: 'user', content: [...imageBlocks, { type: 'text', text: params.userText }] },
      ],
    })
    .finalMessage()

  return response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
}
