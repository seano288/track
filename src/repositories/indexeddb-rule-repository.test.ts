import 'fake-indexeddb/auto'
import { runRuleRepositoryContract } from './rule-repository.contract.ts'
import { IndexedDBRuleRepository } from './indexeddb-rule-repository.ts'

runRuleRepositoryContract(() => IndexedDBRuleRepository.open(`test-rules-${crypto.randomUUID()}`))
