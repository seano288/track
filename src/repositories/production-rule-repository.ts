import { IndexedDBRuleRepository } from './indexeddb-rule-repository.ts'

export const ruleRepository = IndexedDBRuleRepository.open('track')
