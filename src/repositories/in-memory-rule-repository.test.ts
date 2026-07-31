import { runRuleRepositoryContract } from './rule-repository.contract.ts'
import { InMemoryRuleRepository } from './in-memory-rule-repository.ts'

runRuleRepositoryContract(() => new InMemoryRuleRepository())
