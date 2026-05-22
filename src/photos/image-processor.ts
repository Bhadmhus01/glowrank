import sharp from 'sharp'
import type { ImageProcessor, ProcessedImage } from './storage'

/**
 * sharp-based ImageProcessor (CLAUDE.md §2 rule 4 / PRD §5.3). Re-encodes every image to
 * JPEG, which (a) strips ALL metadata/EXIF — sharp does not copy input metadata onto the
 * output unless explicitly told to — and (b) converts HEIC/HEIF (which Anthropic's vision
 * API does not accept) to a vision-safe format. `.rotate()` with no argument bakes in the
 * EXIF orientation first, so the visible image is preserved before the tag is dropped.
 */
export function createSharpImageProcessor(): ImageProcessor {
  return {
    async stripAndNormalize(bytes: Uint8Array): Promise<ProcessedImage> {
      const output = await sharp(bytes).rotate().jpeg({ quality: 82 }).toBuffer()
      return { bytes: new Uint8Array(output), contentType: 'image/jpeg' }
    },
  }
}
