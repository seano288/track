import { describe, expect, it } from 'vitest'
import { dismiss, isDismissed } from './dismissal.ts'

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  }
}

describe('isDismissed', () => {
  it('is false when nothing has been stored', () => {
    expect(isDismissed(fakeStorage())).toBe(false)
  })

  it('is true after dismiss has written to storage', () => {
    const storage = fakeStorage()
    dismiss(storage)
    expect(isDismissed(storage)).toBe(true)
  })

  it('is unaffected by unrelated keys', () => {
    expect(isDismissed(fakeStorage({ 'some-other-key': 'true' }))).toBe(false)
  })
})
