import { describe, it, expect } from 'vitest'
import { isAuthorizedCronRequest } from '../../src/photos/cron-auth'

describe('cron auth', () => {
  it('accepts the correct bearer token', () => {
    expect(isAuthorizedCronRequest('Bearer s3cr3t', 's3cr3t')).toBe(true)
  })

  it('rejects a wrong token', () => {
    expect(isAuthorizedCronRequest('Bearer nope', 's3cr3t')).toBe(false)
  })

  it('rejects a missing Authorization header', () => {
    expect(isAuthorizedCronRequest(undefined, 's3cr3t')).toBe(false)
  })

  it('rejects a bare token without the Bearer scheme', () => {
    expect(isAuthorizedCronRequest('s3cr3t', 's3cr3t')).toBe(false)
  })

  it('fails closed when no secret is configured', () => {
    expect(isAuthorizedCronRequest('Bearer anything', undefined)).toBe(false)
    expect(isAuthorizedCronRequest('Bearer anything', '')).toBe(false)
  })
})
