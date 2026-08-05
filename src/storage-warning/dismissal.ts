const STORAGE_KEY = 'track:storage-warning-dismissed'

export function isDismissed(storage: Pick<Storage, 'getItem'>): boolean {
  return storage.getItem(STORAGE_KEY) === 'true'
}

export function dismiss(storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(STORAGE_KEY, 'true')
}
