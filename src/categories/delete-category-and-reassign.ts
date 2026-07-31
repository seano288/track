import type { Transaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'
import type { CategoryRepository } from '../repositories/category-repository.ts'
import type { TransactionRepository } from '../repositories/transaction-repository.ts'

export async function deleteCategoryAndReassign(
  categoryId: string,
  transactions: Transaction[],
  repositories: { categories: CategoryRepository; transactions: TransactionRepository },
): Promise<number> {
  const affected = transactions.filter((transaction) => transaction.categoryId === categoryId)
  for (const transaction of affected) {
    await repositories.transactions.updateCategory(transaction.id, UNCATEGORIZED)
  }
  await repositories.categories.delete(categoryId)
  return affected.length
}
