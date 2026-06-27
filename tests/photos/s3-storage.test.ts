import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the AWS SDK: capture what gets sent without hitting a real bucket.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))
// function (not arrow) impls so the mocked classes are constructable under `new` in vitest 4.
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () {
    return { send: sendMock }
  }),
  PutObjectCommand: vi.fn(function (input: unknown) {
    return { kind: 'put', input }
  }),
  GetObjectCommand: vi.fn(function (input: unknown) {
    return { kind: 'get', input }
  }),
  DeleteObjectCommand: vi.fn(function (input: unknown) {
    return { kind: 'delete', input }
  }),
  ListObjectsV2Command: vi.fn(function (input: unknown) {
    return { kind: 'list', input }
  }),
}))

import { createS3StorageClient } from '../../src/photos/s3-storage'

const storage = createS3StorageClient({
  bucket: 'glow',
  accessKeyId: 'k',
  secretAccessKey: 's',
  endpoint: 'https://r2.example.com',
})

beforeEach(() => {
  sendMock.mockReset()
})

describe('S3 storage adapter', () => {
  it('put sends a PutObjectCommand with bucket/key/body/contentType', async () => {
    sendMock.mockResolvedValue({})
    await storage.put({
      key: 'photos/2026-05-22/x.jpg',
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'image/jpeg',
      uploadedAt: new Date('2026-05-22T00:00:00Z'),
    })
    const cmd = sendMock.mock.calls[0][0]
    expect(cmd.kind).toBe('put')
    expect(cmd.input).toMatchObject({
      Bucket: 'glow',
      Key: 'photos/2026-05-22/x.jpg',
      ContentType: 'image/jpeg',
    })
  })

  it('get fetches bytes and maps ContentType to a ProcessedImage', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([9, 8, 7]) },
      ContentType: 'image/jpeg',
    })
    const img = await storage.get('photos/2026-05-22/x.jpg')
    const cmd = sendMock.mock.calls[0][0]
    expect(cmd.kind).toBe('get')
    expect(cmd.input).toMatchObject({ Bucket: 'glow', Key: 'photos/2026-05-22/x.jpg' })
    expect(img).toEqual({ bytes: new Uint8Array([9, 8, 7]), contentType: 'image/jpeg' })
  })

  it('get rejects an object whose stored content type is not vision-safe', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1]) },
      ContentType: 'image/heic',
    })
    await expect(storage.get('photos/x.heic')).rejects.toThrow('STORAGE_UNSUPPORTED_CONTENT_TYPE')
  })

  it('get throws when the object body is missing', async () => {
    sendMock.mockResolvedValue({ ContentType: 'image/jpeg' })
    await expect(storage.get('photos/missing.jpg')).rejects.toThrow('STORAGE_OBJECT_NOT_FOUND')
  })

  it('delete sends a DeleteObjectCommand', async () => {
    sendMock.mockResolvedValue({})
    await storage.delete('photos/x.jpg')
    const cmd = sendMock.mock.calls[0][0]
    expect(cmd.kind).toBe('delete')
    expect(cmd.input).toMatchObject({ Bucket: 'glow', Key: 'photos/x.jpg' })
  })

  it('list paginates and maps Key + LastModified to StorageObject[]', async () => {
    const d1 = new Date('2026-01-01T00:00:00Z')
    const d2 = new Date('2026-02-01T00:00:00Z')
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'a', LastModified: d1 }],
        IsTruncated: true,
        NextContinuationToken: 't',
      })
      .mockResolvedValueOnce({ Contents: [{ Key: 'b', LastModified: d2 }], IsTruncated: false })

    const objs = await storage.list()
    expect(objs).toEqual([
      { key: 'a', uploadedAt: d1 },
      { key: 'b', uploadedAt: d2 },
    ])
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it('skips objects missing Key or LastModified', async () => {
    sendMock.mockResolvedValueOnce({
      Contents: [
        { Key: 'a' },
        { LastModified: new Date() },
        { Key: 'b', LastModified: new Date('2026-03-01') },
      ],
      IsTruncated: false,
    })
    const objs = await storage.list()
    expect(objs.map((o) => o.key)).toEqual(['b'])
  })
})
