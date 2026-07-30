import type { Account, NewAccount } from '../domain/account.ts'

export interface AccountRepository {
  create(account: NewAccount): Promise<Account>
  list(): Promise<Account[]>
  delete(id: string): Promise<void>
}
