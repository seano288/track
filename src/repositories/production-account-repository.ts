import { IndexedDBAccountRepository } from './indexeddb-account-repository.ts'

export const accountRepository = IndexedDBAccountRepository.open('track')
