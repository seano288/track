import type { NewRule, Rule } from '../domain/rule.ts'

export interface RuleRepository {
  create(rule: NewRule): Promise<Rule>
  list(): Promise<Rule[]>
  delete(id: string): Promise<void>
  deleteByCategoryId(categoryId: string): Promise<void>
}
