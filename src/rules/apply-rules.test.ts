import { describe, expect, it } from 'vitest'
import type { NewTransaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'
import type { Rule } from '../domain/rule.ts'
import { applyRules } from './apply-rules.ts'

function newTransaction(overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    accountId: 'account-checking',
    date: '2024-01-02',
    amount: -1234,
    description: 'WHOLEFDS MKT 123',
    direction: 'expense',
    categoryId: UNCATEGORIZED,
    ...overrides,
  }
}

function rule(overrides: Partial<Rule> = {}): Rule {
  return { id: 'rule-1', pattern: 'WHOLEFDS', categoryId: 'category-groceries', ...overrides }
}

describe('applyRules', () => {
  it('assigns the category of the first rule whose pattern is contained in the description', () => {
    const transactions = [newTransaction({ description: 'WHOLEFDS MKT 123' })]

    const result = applyRules(transactions, [rule()])

    expect(result[0].categoryId).toBe('category-groceries')
  })

  it('matches case-insensitively', () => {
    const transactions = [newTransaction({ description: 'wholefds mkt 123' })]

    const result = applyRules(transactions, [rule()])

    expect(result[0].categoryId).toBe('category-groceries')
  })

  it('leaves the transaction Uncategorized when no rule matches', () => {
    const transactions = [newTransaction({ description: 'Some Other Store' })]

    const result = applyRules(transactions, [rule()])

    expect(result[0].categoryId).toBe(UNCATEGORIZED)
  })

  it('applies the first matching rule in list order when more than one rule matches', () => {
    const transactions = [newTransaction({ description: 'WHOLEFDS MKT 123' })]
    const rules = [rule({ id: 'rule-1', pattern: 'WHOLEFDS', categoryId: 'category-groceries' }), rule({ id: 'rule-2', pattern: 'MKT', categoryId: 'category-other' })]

    const result = applyRules(transactions, rules)

    expect(result[0].categoryId).toBe('category-groceries')
  })

  it('does not mutate transactions already carrying a category', () => {
    const transactions = [newTransaction({ description: 'WHOLEFDS MKT 123', categoryId: 'category-manual' })]

    const result = applyRules(transactions, [rule()])

    expect(result[0].categoryId).toBe('category-manual')
  })

  it('leaves transactions Uncategorized when there are no rules', () => {
    const transactions = [newTransaction()]

    const result = applyRules(transactions, [])

    expect(result[0].categoryId).toBe(UNCATEGORIZED)
  })
})
