import type { NewRule, Rule } from '../domain/rule.ts'
import type { RuleRepository } from './rule-repository.ts'

export class InMemoryRuleRepository implements RuleRepository {
  #rules: Rule[] = []

  async list(): Promise<Rule[]> {
    return [...this.#rules]
  }

  async create(rule: NewRule): Promise<Rule> {
    const created: Rule = { id: crypto.randomUUID(), ...rule }
    this.#rules.push(created)
    return created
  }

  async delete(id: string): Promise<void> {
    this.#rules = this.#rules.filter((rule) => rule.id !== id)
  }

  async deleteByCategoryId(categoryId: string): Promise<void> {
    this.#rules = this.#rules.filter((rule) => rule.categoryId !== categoryId)
  }
}
