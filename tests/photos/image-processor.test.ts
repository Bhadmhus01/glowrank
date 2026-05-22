import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { createSharpImageProcessor } from '../../src/photos/image-processor'

const processor = createSharpImageProcessor()

function solid(width = 16, height = 16) {
  return sharp({ create: { width, height, channels: 3, background: { r: 40, g: 80, b: 120 } } })
}

describe('sharp image processor', () => {
  it('re-encodes a PNG to a vision-safe JPEG', async () => {
    const png = await solid().png().toBuffer()
    const out = await processor.stripAndNormalize(new Uint8Array(png), 'image/png')
    expect(out.contentType).toBe('image/jpeg')
    expect((await sharp(out.bytes).metadata()).format).toBe('jpeg')
  })

  it('strips EXIF metadata on the output', async () => {
    const withExif = await solid().withExif({ IFD0: { Copyright: 'GlowRank test' } }).jpeg().toBuffer()
    expect((await sharp(withExif).metadata()).exif).toBeDefined() // sanity: input has EXIF

    const out = await processor.stripAndNormalize(new Uint8Array(withExif), 'image/jpeg')
    expect((await sharp(out.bytes).metadata()).exif).toBeUndefined()
  })

  it('converts a HEIF-family (AVIF) image to JPEG', async () => {
    const avif = await solid().avif().toBuffer()
    const out = await processor.stripAndNormalize(new Uint8Array(avif), 'image/avif')
    expect(out.contentType).toBe('image/jpeg')
    expect((await sharp(out.bytes).metadata()).format).toBe('jpeg')
  })
})
