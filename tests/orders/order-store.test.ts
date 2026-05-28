import { describe, it, expect } from 'vitest'
import type { BlobStore } from '../../src/storage/blob-store'
import { createOrderStore, type Order } from '../../src/orders/order-store'
import type { IntakeJson } from '../../src/types'

function fakeBlob() {
  const store = new Map<string, string>()
  const blob: BlobStore = {
    putText: async (k, t) => {
      store.set(k, t)
    },
    getText: async (k) => store.get(k) ?? null,
    delete: async (k) => {
      store.delete(k)
    },
  }
  return { blob, store }
}

const intake: IntakeJson = {
  age: 26,
  gender: 'man',
  goal: 'dating',
  budgetTier: '100-300',
  heightCm: 178,
  bodyType: 'athletic',
  stylePreferences: ['smart-casual'],
  makeupOptin: false,
  email: 'daniel@example.com',
}

const order: Order = {
  id: 'order_abc',
  intake,
  photos: [{ category: 'face-front', key: 'photos/2026-05-22/x.jpg', mediaType: 'image/jpeg' }],
  createdAt: '2026-05-22T00:00:00.000Z',
}

describe('order store', () => {
  it('stores an order under orders/{id}.json and reads it back', async () => {
    const { blob, store } = fakeBlob()
    const orders = createOrderStore(blob)
    await orders.put(order)
    expect(store.has('orders/order_abc.json')).toBe(true)
    expect(await orders.get('order_abc')).toEqual(order)
  })

  it('returns null for an unknown order', async () => {
    const { blob } = fakeBlob()
    expect(await createOrderStore(blob).get('nope')).toBeNull()
  })
})
