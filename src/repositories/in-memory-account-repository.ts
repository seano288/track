import type { Account, NewAccount } from '../domain/account.ts'
import type { AccountRepository } from './account-repository.ts'

export class InMemoryAccountRepository implements AccountRepository {
  #accounts: Account[] = []

  async list(): Promise<Account[]> {
    return [...this.#accounts]
  }

  async create(account: NewAccount): Promise<Account> {
    const created: Account = { id: crypto.randomUUID(), name: account.name }
    this.#accounts.push(created)
    return created
  }

  async delete(id: string): Promise<void> {
    this.#accounts = this.#accounts.filter((account) => account.id !== id)
  }
}
