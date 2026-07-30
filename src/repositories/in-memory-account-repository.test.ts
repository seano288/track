import { runAccountRepositoryContract } from './account-repository.contract.ts'
import { InMemoryAccountRepository } from './in-memory-account-repository.ts'

runAccountRepositoryContract(() => new InMemoryAccountRepository())
