import { describe, it, expect, vi, beforeEach } from 'vitest'

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
}))

import { createS3BlobStore } from '../../src/storage/blob-store'

const blob = createS3BlobStore({ bucket: 'glow', accessKeyId: 'k', secretAccessKey: 's' })

beforeEach(() => {
  sendMock.mockReset()
})

describe('S3 blob store', () => {
  it('putText sends a PutObjectCommand with key/body/contentType', async () => {
    sendMock.mockResolvedValue({})
    await blob.putText('orders/x.json', '{"a":1}', 'application/json')
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      kind: 'put',
      input: {
        Bucket: 'glow',
        Key: 'orders/x.json',
        Body: '{"a":1}',
        ContentType: 'application/json',
      },
    })
  })

  it('getText returns the object body as a string', async () => {
    sendMock.mockResolvedValue({ Body: { transformToString: async () => 'hello' } })
    expect(await blob.getText('k')).toBe('hello')
  })

  it('getText returns null on a missing key (NoSuchKey)', async () => {
    sendMock.mockRejectedValue(Object.assign(new Error('missing'), { name: 'NoSuchKey' }))
    expect(await blob.getText('k')).toBeNull()
  })

  it('getText rethrows non-NoSuchKey errors', async () => {
    sendMock.mockRejectedValue(Object.assign(new Error('boom'), { name: 'AccessDenied' }))
    await expect(blob.getText('k')).rejects.toThrow('boom')
  })
})
